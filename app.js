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

let pointerPosition = 0;

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

const write = (string, buffer) => {
  // TODO: Define range, remove 1024
  const pointer = pointerPosition;
  const view = new Uint8Array(buffer, pointer, 1024);
  const encoder = new TextEncoder();

  view.set(encoder.encode(string));
  pointerPosition += string.length + 1;
  return pointer;
}

const read = (buffer) => {
  // TODO: Define range, remove 1024
  const pointer = pointerPosition;

  const view = new Uint8Array(buffer, pointer, 1024);
  const length = view.findIndex(byte => byte === 0);
  const decoder = new TextDecoder();

  pointerPosition += length + 1;

  return decoder.decode(new Uint8Array(buffer, pointer, length));
};

const askToGreet = async (name, { instance, memory }) => {
  const pointer = instance.exports.alloc();

  write(name, memory.buffer, pointer);

  instance.exports.greet(pointer);
  const res = read(memory.buffer, pointer);
  console.log("Read:", res);
};

const processActions = ({
  instance, memory
}) => {


  const list = vote_token_chain;
  // const listOfActions = fetchActionsFromChain({ smartContractId });

  list.forEach((action) => {
    const pointers = action.args.map((arg, i) => {
      const pointer = write(arg, memory.buffer);
      return pointer;
    })

    const functionRef = instance.exports[action.function];

    functionRef(...pointers);
  })
};

const loadState = ({ instance }) => {
  const memory = instance.exports.memory;

  try {
    const state = fs.readFileSync('./state.json', 'utf8');
    console.log({
      state
    })
    const pointer = write(state, memory.buffer);

    instance.exports.apply_state(pointer);
  } catch (e) {
    console.log('No state found');
  }
}

const saveState = ({ instance }) => {
  const memory = instance.exports.memory;

  instance.exports.get_state(pointerPosition);
  // TODO: Pointer position gets updated by rust, and now we have no clue where it ends
  const state = read(memory.buffer);

  console.log("State:", state);
  fs.writeFileSync('./state.json', state);
}

(async() => {
  const instance = await createInstance();
  const memory = instance.exports.memory;

  pointerPosition = instance.exports.alloc() - 1024;

  // TODO: Read about memory management in Rust/WASM,
  // and how to allocate memory for a string of unknown length.
  // Also, look into conflicting memory management between scrpt and input


  // await askToGreet('John', { instance, memory });
  // await askToGreet('Allen', { instance, memory });

  // Apply state to Rust/WASM
  loadState({
    instance
  });

  // Perform actions after state is applied
  processActions({
     instance, memory
  });

  // Once actions are performed, get state from Rust/WASM
  // and save it to a file. This file will be used to
  // initialize the state on next exection.


  saveState({ instance });
})();