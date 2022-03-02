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

var a = 5000;

const valueTypes = {
    NUMBER: 0,
    BOOL: 1,
    STRING: 2,
    OBJECT: 3,
    ARRAY: 4
}

function getAsyncValue(infoObj) {
    const int32 = new Int32Array(self.sab);
    self.postMessage({
        command: "getValue",
        data: infoObj
    });
    Atomics.wait(int32, 0, 0);
    // console.log(int32[0], int32[1]);
    if(int32[0] === valueTypes.BOOL) {
        const retVal = !!int32[1];
        int32.fill(0, 0, 2);
        return retVal;
    }
}

function setAsyncValue(infoObj) {
    const int32 = new Int32Array(self.sab);
    self.postMessage({
        command: "setValue",
        data: infoObj
    });

    Atomics.wait(int32, 0, 0);
    // console.log(int32[0], int32[1]);

    if(int32[0] === valueTypes.BOOL) {
        const retVal = !!int32[1];
        int32.fill(0, 0, 2);
        return retVal;
    }

    return false;
}

// needs to be agnostic of whether using main thread or worker thread.
// In the actual implementation, the script to be run can either be sent as postmessage
// into this iframe or may be inline generated like below in a script tag.
// Need to see how the build script would work for this.
function setupEnvAndExecuteScript() {
    function consoleAPIProvider() {
        return {
            console: {
                log: console.log,
                println: console.log
            }
        };
    }

    function appAPIProvider() {
        return {
            app: {
                alert: str => {
                    console.log("alert", str);
                    self.postMessage({
                        command: "showAlert",
                        str
                    });

                    const int32 = new Int32Array(self.sab);
                    Atomics.wait(int32, 0, 0);
                    // console.log(int32[0], int32[1]);
                    if(int32[0] === valueTypes.NUMBER) {
                        const retVal = int32[1];
                        int32.fill(0, 0, 2);
                        return retVal;
                    }
                }
            }
        };
    }

    function documentAPIProvider() {
        return {
            document: {
                getField: fieldName => {
                    return createFieldProxy({fieldName});
                }
            }
        }
    }

    function createFieldProxy({fieldName}) {
        const fieldProxyHandler = {
            get: (target, prop, receiver) => {
                console.log("get", prop);
                return getAsyncValue({
                    category: "field",
                    key: prop,
                    fieldName
                });
            },
            set: (obj, prop, value) => {
                console.log("set", prop);
                return setAsyncValue({
                    category: "field",
                    key: prop,
                    fieldName,
                    value
                })
            }
        };

        return new Proxy({}, fieldProxyHandler);
    }

    function createSecureProxyObject(customAPIProviders) {
        const props = getAllPropertyNames(self);
        let obj = {};

        // TODO: avoid two loops
        props.forEach(prop => {
            obj[prop] = null;
        });

        customAPIProviders.forEach(apiProvider => {
            obj = {
                ...obj,
                ...apiProvider()
            };
        });

        return Object.freeze(obj);
    }

    function getAllPropertyNames(obj) {
        var props = [];
        let currObj = obj;

        do {
            Array.prototype.push.apply(props, Object.getOwnPropertyNames(currObj));
        } while ((currObj = Object.getPrototypeOf(currObj)));

        return props;
    }

    const customAPIProviders = [consoleAPIProvider, appAPIProvider];

    // create this object carefully - window/global vars dummy values present in the with object.
    // apart from the vars we use from the window object, stub the rest as null.
    const obj = createSecureProxyObject(customAPIProviders);

    try {
        scriptExecutor.bind(documentAPIProvider().document)(obj);
    } catch (e) {
        console.log(e);
    }
}

self.onmessage = evt => {
    if (evt.data.command === "setBuffer") {
        self.sab = evt.data.data.sab;
    } else if (evt.data.command === "execute") {
        setupEnvAndExecuteScript();
    }
};