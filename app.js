const fs = require('fs');

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

(async() => {
  const instance = await createInstance();
  const memory = instance.exports.memory;

  await askToGreet('John', { instance, memory });

  await askToGreet('Allen', { instance, memory });

})();