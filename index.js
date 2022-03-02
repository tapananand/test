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

import { executeScriptSecurely } from "./runJSSecurely.js";

window.addEventListener('DOMContentLoaded', () => {
    const scriptContent = document.getElementById("scriptContent");
    const runButton = document.getElementById("runButton");

    // Doc level script.
    executeScriptSecurely("");

    runButton.addEventListener("click", (evt) => {
        executeScriptSecurely(scriptContent.value);
    });
});