const fs = require('fs');
function makeIco() {
  const w = 16, h = 16;
  const entrySize = 40 + w * h * 4 + w * h / 8;
  const buf = Buffer.alloc(6 + 16 + entrySize);
  let o = 0;
  buf.writeUInt16LE(0, o); o+=2;
  buf.writeUInt16LE(1, o); o+=2;
  buf.writeUInt16LE(1, o); o+=2;
  buf.writeUInt8(w, o); o+=1;
  buf.writeUInt8(h, o); o+=1;
  buf.writeUInt8(0, o); o+=1;
  buf.writeUInt8(0, o); o+=1;
  buf.writeUInt16LE(1, o); o+=2;
  buf.writeUInt16LE(32, o); o+=2;
  buf.writeUInt32LE(entrySize, o); o+=4;
  buf.writeUInt32LE(22, o); o+=4;
  buf.writeUInt32LE(40, o); o+=4;
  buf.writeInt32LE(w, o); o+=4;
  buf.writeInt32LE(h*2, o); o+=4;
  buf.writeUInt16LE(1, o); o+=2;
  buf.writeUInt16LE(32, o); o+=2;
  buf.writeUInt32LE(0, o); o+=4;
  buf.writeUInt32LE(w*h*4, o); o+=4;
  buf.writeInt32LE(0, o); o+=4;
  buf.writeInt32LE(0, o); o+=4;
  buf.writeUInt32LE(0, o); o+=4;
  buf.writeUInt32LE(0, o); o+=4;
  for(let i=0;i<w*h;i++){ buf[o++]=0x1a; buf[o++]=0x5f; buf[o++]=0xf5; buf[o++]=0xff; }
  for(let i=0;i<w*h/8;i++) buf[o++]=0x00;
  return buf;
}
fs.writeFileSync('src-tauri/icons/icon.ico', makeIco());
console.log('icon.ico ok');