package main

import (
	"fmt"
	"io/ioutil"
	"os"

	wasm "github.com/bytecodealliance/wasmtime-go"
)

type ContractExecution struct {
	wasmPath        string
	stateFile       string
	initialised     bool
	pointerPosition int
	instance        *wasm.Instance
	store           *wasm.Store
	memory          *wasm.Memory
}

type Action struct {
	Function string        `json:"function"`
	Args     []interface{} `json:"args"`
}

func NewContractExecution(contractId string) (*ContractExecution, error) {
	c := &ContractExecution{
		wasmPath:  "./target/wasm32-unknown-unknown/release/hello.wasm",
		stateFile: fmt.Sprintf("./state/%s.json", contractId),
	}

	wasmBytes, err := ioutil.ReadFile(c.wasmPath)
	if err != nil {
		return nil, err
	}

	c.store = wasm.NewStore(wasm.NewEngine())
	module, err := wasm.NewModule(c.store.Engine, wasmBytes)
	if err != nil {
		return nil, err
	}

	instance, err := wasm.NewInstance(c.store, module, nil)
	if err != nil {
		return nil, err
	}

	allocFn := instance.GetExport(c.store, "alloc").Func()
	address, err := allocFn.Call(c.store)
	if err != nil {
		return nil, err
	}

	c.pointerPosition = int(address.(int32))

	c.instance = instance
	c.memory = instance.GetExport(c.store, "memory").Memory()
	c.initialised = true

	c.apply_state()

	return c, nil
}

func (c *ContractExecution) write(str string) int {
	if !c.initialised {
		panic("Contract not initialised")
	}
	ptr := c.pointerPosition

	fmt.Print("Writing to memory: ")
	fmt.Println(str)

	fmt.Print("Pointer position: ")
	fmt.Println(ptr)

	copy(
		c.memory.UnsafeData(c.store)[ptr:],
		[]byte(str),
	)

	c.pointerPosition += len(str) + 1
	return ptr
}

func (c *ContractExecution) readAtCurrentPointer() string {
	if !c.initialised {
		panic("Contract not initialised")
	}

	ptr := c.pointerPosition
	strBytes := c.memory.UnsafeData(c.store)[ptr:]
	str := string(strBytes)

	c.pointerPosition += len(str) + 1
	return str
}

func (c *ContractExecution) readStateFile() string {
	if !c.initialised {
		panic("Contract not initialised")
	}

	file, err := os.ReadFile(c.stateFile)
	if err != nil {
		if os.IsNotExist(err) {
			return ""
		}

		panic(err)
	}

	return string(file)
}

func (c *ContractExecution) apply_state() {
	if !c.initialised {
		panic("Contract not initialised")
	}

	state := c.readStateFile()
	if state != "" {
		pointer := c.write(state)
		c.instance.GetExport(c.store, "apply_state").Func().Call(c.store, pointer)
	}
}

func (c *ContractExecution) ProcessActions(actions []Action) {
	if !c.initialised {
		panic("Contract not initialised")
	}

	for _, action := range actions {
		// map on action.args and store to pointers
		pointers := make([]interface{}, len(action.Args))
		for i, arg := range action.Args {
			pointers[i] = c.write(arg.(string))
		}

		functionRef := c.instance.GetExport(c.store, action.Function)
		functionRef.Func().Call(c.store, pointers...)
	}

	c.save_state()
}

func (c *ContractExecution) save_state() {
	if !c.initialised {
		panic("Contract not initialised")
	}

	c.instance.GetExport(c.store, "get_state").Func().Call(c.store, c.pointerPosition)

	state := c.readAtCurrentPointer()

	err := ioutil.WriteFile(c.stateFile, []byte(state), 0o644)
	if err != nil {
		panic(err)
	}
}

func main() {
	contractId := "123"

	contract, err := NewContractExecution(contractId)
	if err != nil {
		panic(err)
	}

	// print contract
	fmt.Println(contract)

	fmt.Println(contract.readStateFile())

	contract.ProcessActions([]Action{
		{
			Function: "vote",
			Args:     []interface{}{"blue"},
		},
	})

	fmt.Println(contract.readStateFile())
}
