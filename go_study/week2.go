package main

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
)

type Student struct {
	ID    int
	Name  string
	Age   int
	Email string
}

func main() {
	fmt.Println("====文件操作和JSON====")
	student := []Student{
		{ID: 0, Name: "zhangsan", Age: 33, Email: "zhangsan@333.com"},
		{ID: 1, Name: "lisi", Age: 44, Email: "zhangsan@444.com"},
		{ID: 2, Name: "wangwu", Age: 55, Email: "wangwu@555.com"},
	}
	// 将数据序列化为JSON
	jsonData, err := json.MarshalIndent(student, "", "  ")
	if err != nil {
		log.Fatal("JSON序列化失败:", err)
	}
	fmt.Println("stu: ", student, " jsondata_: ", jsonData)
	// 写入文件
	filename := "students.json"
	err = os.WriteFile(filename, jsonData, 0644)
	if err != nil {
		log.Fatal("写入文件失败:", err)
	}
	fmt.Printf("数据已写入 %s\n", filename)

}
