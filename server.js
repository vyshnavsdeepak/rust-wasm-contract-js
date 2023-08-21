const express = require('express');
const morgan = require('morgan');
const expressListEndpoints = require('express-list-endpoints');
// const { readSaveStateFile } = require('./runtime');
const { getContract } = require('./contract');
const app = express();
const port = 8304;

// Use morgan middleware to log incoming requests
app.use(morgan('dev'));

// Use express middleware to parse JSON body
app.use(express.json());

// Define routes
app.get('/', (req, res) => {
  res.send('Hello, this is the homepage!');
});

app.post('/:contract_id/events', async (req, res) => {
  const { body } = req;
  const { contract_id } = req.params;

  console.log('Received event:', body);

  const contract = await getContract(contract_id);
  contract.processActions(body);
  res.send('OK');
});

app.get('/:contract_id/state',async (req, res) => {
  const { contract_id } = req.params;

  const contract = await getContract(contract_id);
  try {
    const stateStr = contract.readStateFile();
    res.json(JSON.parse(stateStr));
  }
  catch (e) {
    res.status(404).send('Not found');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);

  console.log(expressListEndpoints(app));
});
