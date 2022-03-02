console.log("worker up");
let commSab;
let commSabView;

self.onmessage = (evt) => {
    console.log(evt);
    // lets say we want to execute a script getting a field value.
    if(evt.data.exec) {
        setTimeout(() => {
            console.log("executed");
            commSabView[0] = 1 + Math.ceil(100 * Math.random());
        }, 2500); // emulating some async work
    } 
    else if(evt.data.buff) {
        commSab = evt.data.buff;
        commSabView = new Int32Array(commSab);
        console.log(commSabView[0]);
    }
}

/**
 * Using this approach we can even communicate to T4 via the UI thread.
 * There  can 2^31-1 types of messages we can communicate here, so there is plenty of room.
 */