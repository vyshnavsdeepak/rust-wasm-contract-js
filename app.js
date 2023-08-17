const fs = require('fs');

const vote_token_chain = [
  {
    blockID: 1,
    function: 'vote',
    args: ['red'],
  },
  {
    blockID: 2,
    function: 'vote',
    args: ['blue'],
  },
  {
    blockID: 3,
    function: 'vote',
    args: ['red'],
  }
]

const createInstance = async () => {
  const path = './target/wasm32-unknown-unknown/release/hello.wasm';
  const buff = fs.readFileSync(path);
  const bytes = new Uint8Array(buff);

  const { instance } = await WebAssembly.instantiate(bytes, {
    env: {
      abort: () => console.log('Abort!')
    },
  });

  return instance;
};

const write = (string, buffer, pointer) => {
  const view = new Uint8Array(buffer, pointer, 1024);
  const encoder = new TextEncoder();

  view.set(encoder.encode(string));
}

const read = (buffer, pointer) => {
  const view = new Uint8Array(buffer, pointer, 1024);
  const length = view.findIndex(byte => byte === 0);
  const decoder = new TextDecoder();

  return decoder.decode(new Uint8Array(buffer, pointer, length));
};

const askToGreet = async (name, { instance, memory }) => {
  const pointer = instance.exports.alloc();

  write(name, memory.buffer, pointer);

  instance.exports.greet(pointer);
  console.log("Read:", read(memory.buffer, pointer))
};

const processActions = ({
  instance, memory
}) => {


  const list = vote_token_chain;
  // const listOfActions = fetchActionsFromChain({ smartContractId });

  list.forEach((action) => {
    const pointerStart = instance.exports.alloc();

    const pointers = action.args.map((arg, i) => {
      const pointer = pointerStart + (i * 1024);
      write(arg, memory.buffer, pointer);
    })

    instance.exports[action.function](...pointers);
    console.log("Read:", read(memory.buffer, pointerStart))
  })
};

(async() => {
  const instance = await createInstance();
  const memory = instance.exports.memory;

  // await askToGreet('John', { instance, memory });
  // await askToGreet('Allen', { instance, memory });

  // Apply state to Rust/WASM

  // Perform actions after state is applied
  processActions({
     instance, memory
  });

  // Once actions are performed, get state from Rust/WASM
  // and save it to a file. This file will be used to
  // initialize the state on next exection.



})();