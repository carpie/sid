'use strict';

var BPromise = require('bluebird');

const spawn = require('child_process').spawn;

/**
 * Executes `cmd` in a system shell and returns a Promise to be fulfilled when the process ends.
 * On fulfullment, the promise will return:
 * {
 *   stdout: [ Array of stdout lines ],
 *   stderr: [ Array of stderr lines ],
 *   exitCode: The numeric exit code the process ended with
 * }
 */
const conexec = (cmd, args) => {
    return new BPromise((resolve, reject) => {
        const stdout = [];
        const stderr = [];
        const cp = spawn(cmd, args);

        cp.stdout.on('data', (data) => {
            stdout.push(data);
        });

        cp.stderr.on('data', (data) => {
            stderr.push(data);
        });

        cp.on('close', (code) => {
            let normalizedStdout = stdout.join().split(/\r*\n/);
            let normalizedStderr = stderr.join().split(/\r*\n/);
            // Trim trailing empty line if present
            const stdoutEnd = normalizedStdout.slice(-1);
            if (stdoutEnd.length === 1 && stdoutEnd[0].length === 0) {
                normalizedStdout = normalizedStdout.slice(0, -1);
            }
            const stderrEnd = normalizedStderr.slice(-1);
            if (stderrEnd.length === 1 && stderrEnd[0].length === 0) {
                normalizedStderr = normalizedStderr.slice(0, -1);
            }
            return resolve({
                stdout: normalizedStdout,
                stderr: normalizedStderr,
                exitCode: code
            });
        });

        cp.on('error', (err) => {
            return reject(err);
        });
    });
};

module.exports = {
    conexec
};
