const {parentPort} = require('worker_threads');
const fs = require('fs');

let queue = [];
let active = false;

parentPort.on('message', o => {
  if (active) {
      queue.push(o);
  } else {
      active = true;
      process(o);
  }
});

function process(o) {
    try {
        let running = o.actions.length;
        // Safety short circuit in case we somehow start a worker with nothing.
        running === 0 && parentPort.postMessage('');
    
        o.actions.forEach(a => {
          fs.copyFile(a.src, a.dest, 0, err => {
            if (err) {
              parentPort.emit('error', err);
            } else {
              running -= 1;
              if (running === 0) {
                  if (queue.length === 0) {
                    active = false;
                    parentPort.postMessage('');
                  } else {
                      const next = queue.pop();
                      process(next);
                  }
              }
            }
          });
        });
      } catch (e) {
        parentPort.emit('error', e);
      }
}