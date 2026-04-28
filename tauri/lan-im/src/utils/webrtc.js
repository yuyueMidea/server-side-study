/**
 * WebRTC P2P manager for LAN-IM
 * Handles offer/answer via Tauri signaling channel,
 * data channels for text + chunked file transfer.
 */

import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useMessagesStore, useConnectionStore, usePeersStore, useIdentityStore } from "@/stores";

const CHUNK_SIZE = 64 * 1024; // 64 KB

export class WebRTCManager {
  constructor() {
    this.msgStore  = useMessagesStore();
    this.connStore = useConnectionStore();
    this.peerStore = usePeersStore();
    this.idStore   = useIdentityStore();
    this._setupSignalingListeners();
  }

  // ── Tauri event-based signaling ───────────────────────────────────────────
  async _setupSignalingListeners() {
    await listen("rtc-offer",   e => this._handleOffer(e.payload));
    await listen("rtc-answer",  e => this._handleAnswer(e.payload));
    await listen("rtc-ice",     e => this._handleIce(e.payload));
  }

  // ── Initiate connection to peer ───────────────────────────────────────────
  async connect(peerId) {
    const peer = this.peerStore.peers.find(p => p.id === peerId);
    if (!peer) return;

    const pc = this.connStore.getOrCreatePc(peerId);
    const dc = pc.createDataChannel("chat", { ordered: true });
    this.connStore.setDataChannel(peerId, dc);
    this._setupDcHandlers(peerId, dc);

    pc.onicecandidate = e => {
      if (e.candidate) {
        invoke("send_signal", {
          targetIp: peer.ip, targetPort: peer.port,
          payload: JSON.stringify({ type: "ice", from: this.idStore.localIp, candidate: e.candidate }),
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    invoke("send_signal", {
      targetIp: peer.ip, targetPort: peer.port,
      payload: JSON.stringify({ type: "offer", from: this.idStore.localIp, fromId: this.idStore.username, sdp: offer }),
    });
  }

  async _handleOffer({ from, fromId, sdp, peerId }) {
    const pc = this.connStore.getOrCreatePc(peerId || from);

    pc.ondatachannel = e => {
      this.connStore.setDataChannel(peerId || from, e.channel);
      this._setupDcHandlers(peerId || from, e.channel);
    };

    const peer = this.peerStore.peers.find(p => p.ip === from);
    pc.onicecandidate = e => {
      if (e.candidate && peer) {
        invoke("send_signal", {
          targetIp: peer.ip, targetPort: peer.port,
          payload: JSON.stringify({ type: "ice", from: this.idStore.localIp, candidate: e.candidate }),
        });
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    if (peer) {
      invoke("send_signal", {
        targetIp: peer.ip, targetPort: peer.port,
        payload: JSON.stringify({ type: "answer", from: this.idStore.localIp, sdp: answer }),
      });
    }
  }

  async _handleAnswer({ from, sdp }) {
    const peer = this.peerStore.peers.find(p => p.ip === from);
    if (!peer) return;
    const conn = this.connStore.connections[peer.id];
    if (conn?.pc) await conn.pc.setRemoteDescription(new RTCSessionDescription(sdp));
  }

  async _handleIce({ from, candidate }) {
    const peer = this.peerStore.peers.find(p => p.ip === from);
    if (!peer) return;
    const conn = this.connStore.connections[peer.id];
    if (conn?.pc) await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
  }

  // ── DataChannel handlers ──────────────────────────────────────────────────
  _setupDcHandlers(peerId, dc) {
    let fileBuffer = null;
    let fileMeta   = null;
    let received   = 0;

    dc.onmessage = e => {
      // Binary chunk
      if (e.data instanceof ArrayBuffer) {
        if (!fileBuffer || !fileMeta) return;
        const chunk = new Uint8Array(e.data);
        fileBuffer.set(chunk, received);
        received += chunk.byteLength;
        const progress = Math.round((received / fileMeta.size) * 100);
        this.connStore.updateTransfer(fileMeta.id, { progress });

        if (received >= fileMeta.size) {
          const blob = new Blob([fileBuffer]);
          const url  = URL.createObjectURL(blob);
          this.msgStore.addMessage(peerId, {
            from: peerId, type: "file",
            fileName: fileMeta.name, fileSize: fileMeta.size,
            fileUrl: url, timestamp: Date.now(),
          });
          this.connStore.updateTransfer(fileMeta.id, { status: "done", progress: 100 });
          fileBuffer = null; fileMeta = null; received = 0;
        }
        return;
      }

      // JSON control / text message
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      if (msg.type === "text") {
        const m = { from: peerId, text: msg.text, timestamp: msg.timestamp, type: "text" };
        this.msgStore.addMessage(peerId, m);
        this.msgStore.saveToDB(peerId, m);
      } else if (msg.type === "file-meta") {
        fileMeta   = msg;
        fileBuffer = new Uint8Array(msg.size);
        received   = 0;
        this.connStore.trackTransfer(msg.id, { name: msg.name, size: msg.size, status: "receiving" });
      }
    };

    dc.onerror = () => this._fallbackToWebSocket(peerId);
  }

  // ── Send text message ─────────────────────────────────────────────────────
  sendText(peerId, text) {
    const conn = this.connStore.connections[peerId];
    const msg  = { type: "text", text, timestamp: Date.now() };

    if (conn?.dc?.readyState === "open") {
      conn.dc.send(JSON.stringify(msg));
      return true;
    }
    // WebSocket fallback
    if (conn?.ws?.readyState === 1) {
      conn.ws.send(JSON.stringify({ ...msg, to: peerId }));
      return true;
    }
    return false;
  }

  // ── Send file via DataChannel ─────────────────────────────────────────────
  async sendFile(peerId, file) {
    const conn = this.connStore.connections[peerId];
    if (!conn?.dc || conn.dc.readyState !== "open") {
      console.warn("DataChannel not open, cannot send file");
      return false;
    }

    const transferId = `${Date.now()}-${Math.random()}`;
    this.connStore.trackTransfer(transferId, { name: file.name, size: file.size, status: "sending" });

    // Send metadata
    conn.dc.send(JSON.stringify({
      type: "file-meta", id: transferId, name: file.name, size: file.size,
    }));

    // Stream chunks
    const buffer = await file.arrayBuffer();
    let offset = 0;
    while (offset < buffer.byteLength) {
      const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
      conn.dc.send(chunk);
      offset += chunk.byteLength;
      const progress = Math.round((offset / buffer.byteLength) * 100);
      this.connStore.updateTransfer(transferId, { progress });
      // Flow control
      if (conn.dc.bufferedAmount > 4 * 1024 * 1024) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    this.connStore.updateTransfer(transferId, { status: "done", progress: 100 });
    return true;
  }

  // ── WebSocket fallback ────────────────────────────────────────────────────
  _fallbackToWebSocket(peerId) {
    const peer = this.peerStore.peers.find(p => p.id === peerId);
    if (!peer) return;
    const ws = this.connStore.openWebSocket(peerId, peer.ip, peer.port + 1, e => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "text") {
          const m = { from: peerId, text: msg.text, timestamp: msg.timestamp, type: "text" };
          this.msgStore.addMessage(peerId, m);
          this.msgStore.saveToDB(peerId, m);
        }
      } catch {}
    });
    console.info(`[${peerId}] Fell back to WebSocket`);
  }
}

let _manager = null;
export function useWebRTC() {
  if (!_manager) _manager = new WebRTCManager();
  return _manager;
}
