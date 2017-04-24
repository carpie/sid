'use strict';

const test = require('tape');
const proxyquire = require('proxyquire');


// Capture the spawn call to return what we want
let useAlternateDataset = false;
const cpStub = {
  cmd: '',
  args: [],
  onHandler(evt, callback) {
    if (evt === 'close' && this.cmd !== 'fail') {
      if (useAlternateDataset) {
        return process.nextTick(() => callback(0));
      }
      return process.nextTick(() => callback(42));
    } else if (evt === 'error' && this.cmd === 'fail') {
      process.nextTick(() => callback('Oops'));
    }
  },
  onStdoutDataHandler(evt, callback) {
    if (useAlternateDataset) {
      return callback('this is stdout line 1\nand line two');
    }
    return callback('this is stdout line 1\nand line two\n');
  },
  onStderrDataHandler(evt, callback) {
    if (useAlternateDataset) {
      return callback('this is stderr line 1');
    }
    return callback('this is stderr line 1\nand line two\n');
  },
  spawn(cmd, args) {
    cpStub.cmd = cmd;
    cpStub.args = args;
    return {
      on: cpStub.onHandler.bind(cpStub),
      stdout: {
        on: cpStub.onStdoutDataHandler
      },
      stderr: {
        on: cpStub.onStderrDataHandler
      }
    };
  }
};
const conexec = proxyquire('../src/conexec', { 'child_process': cpStub }).conexec;


test('=== conexec setup', (t) => {
  t.end();
});


test('conexec returns stdout, stderr, and exit code', (t) => {
  useAlternateDataset = false;
  conexec('foo', ['one', 'two'])
  .then((res) => {
    t.equal(cpStub.cmd, 'foo');
    t.deepEqual(cpStub.args, ['one', 'two']);
    t.deepEqual(res.stdout, ['this is stdout line 1', 'and line two']);
    t.deepEqual(res.stderr, ['this is stderr line 1', 'and line two']);
    t.equal(42, res.exitCode);
    t.end();
  })
  .catch((err) => {
    t.fail(`Unexpected error ${err}`);
    t.end();
  });
});


test('conexec handles output with no ending newline', (t) => {
  useAlternateDataset = true;
  conexec('foo', ['one', 'two'])
  .then((res) => {
    t.equal(cpStub.cmd, 'foo');
    t.deepEqual(cpStub.args, ['one', 'two']);
    t.deepEqual(res.stdout, ['this is stdout line 1', 'and line two']);
    t.deepEqual(res.stderr, ['this is stderr line 1']);
    t.equal(0, res.exitCode);
    t.end();
  })
  .catch((err) => {
    t.fail(`Unexpected error ${err}`);
    t.end();
  });
});


test('conexec reports errors', (t) => {
  useAlternateDataset = false;
  conexec('fail', ['one', 'two'])
  .then((res) => {
    t.fail(`Unexpected result ${res}`);
    t.end();
  })
  .catch((err) => {
    t.equal(err, 'Oops');
    t.end();
  });
});


test('=== conexec teardown', (t) => {
  t.end();
});
