const fs = require("fs");

class ContractExecution {
  constructor(contractId) {
    // this.path = `./contracts/${contractId}.wasm`;
    this.wasmPath = `./target/wasm32-unknown-unknown/release/hello.wasm`;

    this.stateFile = `./state/${contractId}.json`

    this.initialised = false;
    this.pointerPosition = 0;
    this.instance = null;
  }

  async initialise() {
    const wasmBytes = new Uint8Array(
      fs.readFileSync(this.wasmPath)
    );

    const { instance } = await WebAssembly.instantiate(wasmBytes, {
      env: {
        abort: () => console.log('Abort!')
      },
    });

    this.instance = instance;
    this.initialised = true;

    this.pointerPosition = this.instance.exports.alloc() - 1024;
    this.applyState();
    return this;
  }

  write(string) {
    if (!this.initialised) {
      throw new Error("Contract not initialised");
    }

    const pointer = this.pointerPosition;
    const view = new Uint8Array(this.instance.exports.memory.buffer, pointer, 1024);
    const encoder = new TextEncoder();

    view.set(encoder.encode(string));
    this.pointerPosition += string.length + 1;
    return pointer;
  }

  readAtCurrentPointer() {
    if (!this.initialised) {
      throw new Error("Contract not initialised");
    }

    const pointer = this.pointerPosition;

    const view = new Uint8Array(this.instance.exports.memory.buffer, pointer, 1024);
    const length = view.findIndex(byte => byte === 0);
    const decoder = new TextDecoder();

    this.pointerPosition += length + 1;

    return decoder.decode(new Uint8Array(this.instance.exports.memory.buffer, pointer, length));
  }

  applyState() {
    if (!this.initialised) {
      throw new Error("Contract not initialised");
    }

    try {
      const state = this.readStateFile();

      const pointer = this.write(state);
      this.instance.exports.apply_state(pointer);
    } catch (e) {
      console.log("No state file found");
      console.log(e);
    }
  }

  processActions(actions) {
    if (!this.initialised) {
      throw new Error("Contract not initialised");
    }

    actions.forEach(action => {
      const pointers = action.args.map((arg, i) => {
        const pointer = this.write(arg);
        return pointer;
      });

      const functionRef = this.instance.exports[action.function];
      functionRef(...pointers);
    });

    this.saveState();
  }

  saveState() {
    if (!this.initialised) {
      throw new Error("Contract not initialised");
    }

    this.instance.exports.get_state(
      this.pointerPosition
    );
    const state = this.readAtCurrentPointer();

    fs.writeFileSync(this.stateFile, state);
  }

  readStateFile() {
    if (!this.initialised) {
      throw new Error("Contract not initialised");
    }

    const state = fs.readFileSync(this.stateFile, 'utf8');
    return state;
  }
}

const cachedContracts = {};

const getContract = async (contractId) => {
  if (!cachedContracts[contractId]) {
    cachedContracts[contractId] = await (new ContractExecution(contractId).initialise());
  }

  return cachedContracts[contractId];
}

module.exports = {
  getContract,
};
