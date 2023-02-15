window.addEventListener('load', function(){
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    const snail = document.getElementById('snail');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    class Bar {
        constructor(x, y, width, height, color, index){
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.color = color;
            this.index = index;
        }
        update(micInput){
            const sound  = micInput * 300;
            if (sound > this.height){
                this.height = sound;
            } else {
                this.height -= this.height * 0.03;
            }
        }
        draw(context){
            context.strokeStyle = this.color;
            context.lineWidth = this.width;
            context.save();
            context.rotate(this.index * 0.043);
            context.beginPath();
            context.bezierCurveTo(this.x/2, this.y/2, this.height * -0.5 - 150, this.height + 50, this.x, this.y);
            context.stroke();
            
            if (this.index > 170){
                context.beginPath();
                context.arc(this.x, this.y + 10 + this.height/2 + this.height * 0.1, this.height * 0.05, 0, Math.PI * 2);
                context.stroke();
                context.beginPath();
                context.moveTo(this.x, this.y + 10);
                context.lineTo(this.x, this.y + 10 + this.height/2);
                context.stroke();
            }
            context.restore();
        }
    }

    class Microphone {
        constructor(fftSize){
            this.initialized = false;
            navigator.mediaDevices.getUserMedia({audio: true})
            .then(function(stream){
                this.audioContext = new AudioContext();
                this.microphone = this.audioContext.createMediaStreamSource(stream);
                this.analyser = this.audioContext.createAnalyser();
                this.analyser.fftSize = fftSize;
                const bufferLength = this.analyser.frequencyBinCount;
                this.dataArray = new Uint8Array(bufferLength);
                this.microphone.connect(this.analyser);
                this.initialized = true;
            }.bind(this)).catch(function(err){
                alert(err);
            });
        }
        getSamples(){
            this.analyser.getByteTimeDomainData(this.dataArray);
            let normSamples = [...this.dataArray].map(e => e/128-1);
            return normSamples;
        }
        getVolume(){
            this.analyser.getByteTimeDomainData(this.dataArray);
            let normSamples = [...this.dataArray].map(e => e/128-1);
            let sum = 0;


            for (let i = 0; i < normSamples.length; i++){
                sum += normSamples[i] * normSamples[i];
            }
            let volume = Math.sqrt(sum / normSamples.length);
            return volume;
        }
    }

    let fftSize = 512;
    const microphone = new Microphone(fftSize);
    let bars = [];
    let barWidth = canvas.width/(fftSize/2);
    function createBars(){
        for (let i = 1; i < (fftSize/2); i++){
            let color = 'hsl(' + i * 2 + ',100%, 50%)';
            bars.push(new Bar(0, i * 0.9, 0.5, 0, 'white', i))
        }
    }
    createBars();

    let softVolume = 0;
    function animate(){
        if (microphone.initialized){
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const samples = microphone.getSamples();
            const volume = microphone.getVolume();
            ctx.save();
            ctx.translate(canvas.width/2 - 70, canvas.height/2 + 50);
            bars.forEach(function(bar, i){
                bar.update(samples[i]);
                bar.draw(ctx);
            });
            ctx.restore();

            softVolume = softVolume * 0.9 + volume * 0.1;
            snail.style.transform = 'translate(-50%, -50%) scale(' + (1 + softVolume * 3), (1 + softVolume * 3) + ')';
        }
        requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', function(){
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
});


// collect DOMs
const display = document.querySelector('.display')
const controllerWrapper = document.querySelector('.controllers')

const State = ['Initial', 'Record', 'Download']
let stateIndex = 0
let mediaRecorder, chunks = [], audioURL = ''

// mediaRecorder setup for audio
if(navigator.mediaDevices && navigator.mediaDevices.getUserMedia){
    console.log('mediaDevices supported..')

    navigator.mediaDevices.getUserMedia({
        audio: true
    }).then(stream => {
        mediaRecorder = new MediaRecorder(stream)

        mediaRecorder.ondataavailable = (e) => {
            chunks.push(e.data)
        }

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, {'type': 'audio/ogg; codecs=opus'})
            chunks = []
            audioURL = window.URL.createObjectURL(blob)
            document.querySelector('audio').src = audioURL

        }
    }).catch(error => {
        console.log('Following error has occured : ',error)
    })
}else{
    stateIndex = ''
    application(stateIndex)
}

const clearDisplay = () => {
    display.textContent = ''
}

const clearControls = () => {
    controllerWrapper.textContent = ''
}

const record = () => {
    stateIndex = 1
    mediaRecorder.start()
    application(stateIndex)
}

const stopRecording = () => {
    stateIndex = 2
    mediaRecorder.stop()
    application(stateIndex)
}

const downloadAudio = () => {
    const downloadLink = document.createElement('a')
    downloadLink.href = audioURL
    downloadLink.setAttribute('download', 'audio')
    downloadLink.click()
}

const addButton = (id, funString, text) => {
    const btn = document.createElement('button')
    btn.id = id
    btn.setAttribute('onclick', funString)
    btn.textContent = text
    controllerWrapper.append(btn)
}

const addMessage = (text) => {
    const msg = document.createElement('p')
    msg.textContent = text
    display.append(msg)
}

const addAudio = () => {
    const audio = document.createElement('audio')
    audio.controls = true
    audio.src = audioURL
    display.append(audio)
}

const application = (index) => {
    switch (State[index]) {
        case 'Initial':
            clearDisplay()
            clearControls()

            addButton('record', 'record()', 'Start Recording')
            break;

        case 'Record':
            clearDisplay()
            clearControls()

            addMessage('Recording...')
            addButton('stop', 'stopRecording()', 'Stop Recording')
            break

        case 'Download':
            clearControls()
            clearDisplay()

            addAudio()
            addButton('record', 'record()', 'Record Again')
            break

        default:
            clearControls()
            clearDisplay()

            addMessage('Your browser does not support mediaDevices')
            break;
    }

}

application(stateIndex)