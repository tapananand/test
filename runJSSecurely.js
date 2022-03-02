/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2020 Adobe
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers, if any. The intellectual
 * and technical concepts contained herein are proprietary to Adobe
 * and its suppliers and are protected by all applicable intellectual
 * property laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 **************************************************************************/

let useWebWorker = true;
let scriptIframe = null;
// const jsSDKKeysToStoreMapping = {
//   hidden: {
//     get: "isHidden",
//     set: "setIsHidden"
//   }
// };

export const executeScriptSecurely = script => {
  ensureSandboxedIframeExists().then(() => {
    sendScriptRunningInfo(script);
  });
};

function ensureSandboxedIframeExists() {
  if (!scriptIframe) {
    return new Promise((resolve, reject) => {
      createSandboxedIframe(err => {
        err ? reject(err) 
          : scriptIframe.contentWindow.setSAB(blockUnblockSAB);
          resolve();
      });
    });
  }
  return Promise.resolve();
}

function createSandboxedIframe(iframeReadyCb) {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.style.height = "0px";
  iframe.style.width = "0px";

  // if not using web workers, dialogs need to be synchronous
  // and hence we would have to use native alerts which requires allow-modals permission
  if (useWebWorker) {
    iframe.sandbox = "allow-scripts allow-same-origin";
  } else {
    iframe.sandbox = "allow-scripts allow-modals";
  }

  iframe.allow = "";
  iframe.referrerPolicy = "no-referrer";

  // TODO: ideally this path should be acessed from elsewhere by not accesing dc-core in this code
  // iframe.src = `${discovery.dropins.preview.public_path}jsHelper.html`;
  iframe.src = `iframe.html`;

  document.body.appendChild(iframe);

  registerForMessagesFromIframe(iframeReadyCb); // if script execution done, send message to iframe to cleanup things inside it.
  scriptIframe = iframe;
}

function destroySandboxedIframe() {
  document.body.removeChild(scriptIframe);
  scriptIframe = null;
}

function registerForMessagesFromIframe(iframeReadyCb) {
  window.addEventListener("message", evt => {
    if (evt.source !== scriptIframe.contentWindow) {
      console.log("ignoring msg");
    } else {
      if (evt.data.ready) {
        iframeReadyCb();
      } else {
        processMessageFromInsecureIframe(evt.data);
      }
    }
  });
}

function sendWorkerScript() {
  if (!useWebWorker) return Promise.resolve();

  return fetch(`./worker.js`)
    .then(resp => resp.text())
    .then(workerScript => {
      scriptIframe.contentWindow.postMessage(
        {
          workerScript
        },
        "*"
      );
    });
}

function processMessageFromInsecureIframe(data) {
  if (data.command === "showAlert") {
    console.log("alert");
    dialogApi.show(dialogTypes.JAVASCRIPT_DIALOG, {
      str: data.str,
      buttonHandler: resp => {
        console.log(resp);
        dialogApi.hide();
        scriptIframe.contentWindow.postMessage(
          {
            command: "showAlert",
            data: {
              done: true,
              resp
            }
          },
          "*"
        );
      }
    });
  } else if (data.command === "getValue") {
    if (data.data.category === "field") {
      const value = getFieldValue(data);
      scriptIframe.contentWindow.postMessage(
        {
          command: "getValue",
          data: {
            done: true,
            type: typeof value,
            value
          }
        },
        "*"
      );
    }
  } else if (data.command === "setValue") {
    if (data.data.category === "field") {
      scriptIframe.contentWindow.postMessage(
        {
          command: "setValue",
          data: {
            done: setFieldValue(data)
          }
        },
        "*"
      );
    }
  }
}

function getFieldValue(data) {
  if (data.data.fieldName) {
    const field = getFormFieldsByFieldName(stores, data.data.fieldName)[0];
    return field[jsSDKKeysToStoreMapping[data.data.key].get];
  }
}

function setFieldValue(data) {
  console.log(data);
  if (data.data.fieldName) {
    const field = getFormFieldsByFieldName(stores, data.data.fieldName)[0];
    field[jsSDKKeysToStoreMapping[data.data.key].set](data.data.value);
    return true;
  }
}

let blockUnblockSAB = new SharedArrayBuffer(1024);
let int32View = new Int32Array(blockUnblockSAB);
int32View.fill(0);

function sendScriptRunningInfo(script) {
  // scriptIframe.contentWindow.postMessage(
  //   {
  //     script,
  //     useWebWorker
  //   },
  //   "*"
  // );

  // Needed to add tihs timeout, to allow worker creation to settle down 
  // (since creation of worker seems to need main thread to not be blocked)
  setTimeout(() => {
    scriptIframe.contentWindow.executeSomeDummyJS(""); // the script string doesn't matter for this POC, just executing some dummy code in worker 
    goIntoJSExecutionCycle();
  }, 100);
}

function isThereAMessage(arr) {
  return !!arr[0];
}

function isDoneMessage(arr) {
  return arr[0] === -1;
}

function goIntoJSExecutionCycle() {
  // console.log(int32View[0]);
  // setTimeout(() => {
  //   console.log(int32View[0]);
  // }, 2000);
  let numIter = 0;
  while(!isDoneMessage(int32View)) {
    // console.log("check", int32View[0]);
    if(isThereAMessage(int32View)) {
      if(processMessage(int32View)) {
        console.log("breaking...");
        break;
      }
    }

    numIter++;
  }

  int32View.fill(0);
}

function appendElem(str) {
  const div = document.createElement("div");
  div.innerText = str;
  document.body.appendChild(div);
}

function processMessage(buff) {
  if(buff[0] % 2) {
    console.log("even");
    appendElem("even");
    return true;
  } else {
    console.log("odd");
    appendElem("odd");
    return true;
  }

  return false;
} 
