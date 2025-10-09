package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"
)

func count(path string) (lines, words, bytes int, err error) {
	f, err := os.Open(path)
	if err != nil {
		return
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	sc.Split(bufio.ScanLines)
	for sc.Scan() {
		lines++
		line := sc.Text()
		bytes += len(line) + 1 // 简化：含换行
		ws := bufio.NewScanner(strings.NewReader(line))
		ws.Split(bufio.ScanWords)
		for ws.Scan() {
			words++
		}
	}
	return lines, words, bytes, sc.Err()
}
func main() {
	println("===== read file and count ====")
	path := flag.String("f", "", "file path")
	flag.Parse()
	if *path == "" {
		fmt.Fprintln(os.Stderr, "usage: wc -f <file>")
		os.Exit(2)
	}
	l, w, b, err := count(*path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "count error: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("lines=%d words=%d bytes=%d\n", l, w, b)
}

//测试命令：go run bufio_demo1.go -f hello.txt
