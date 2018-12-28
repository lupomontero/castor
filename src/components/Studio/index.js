import React from 'react';
import Button from './Button';


const resolutions = {
  '1080p':{ width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
};


const sources = {
  audio: { audio: true },
  camera: { video: true },
  screen: { video: { mediaSource: 'screen' } },
};


const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  canvas: {
    backgroundColor: '#666',
    maxWidth: '100%',
    maxHeight: '100vh',
  },
  toolbar: {
    position: 'absolute',
    bottom: '10%',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toolbarGroup: {
    padding: 10,
  },
};


const createVideoSource = (stream) => {
  const streamSettings = stream.getVideoTracks()[0].getSettings();
  const video = document.createElement('video');
  video.setAttribute('width', streamSettings.width);
  video.setAttribute('height', streamSettings.height);
  video.srcObject = stream;
  video.play();
  return { stream, video };
};


const createAudioSource = (stream) => {
  // meter?
  return { stream };
};


class Studio extends React.Component {
  constructor(props) {
    super(props);

    this.canvas = null;
    this.recorder = null;
    this.recordedBlobs = [];

    this.state = {
      audio: false,
      camera: false,
      screen: false,
      resolution: '720p',
      isRecording: false,
      isPaused: false,
    };

    this.update = this.update.bind(this);
    this.getUserMedia = this.getUserMedia.bind(this);
    this.record = this.record.bind(this);
    this.pause = this.pause.bind(this);
    this.stop = this.stop.bind(this);
  }

  componentDidMount() {
    console.log('componentDidMount');
    this.update();
  }

  componentWillUnmount() {
    console.log('componentWillUnmount');
  }

  update() {
    const { canvas, state } = this;
    const { audio, camera, screen } = state;

    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (screen && screen.video) {
      // TODO: assuming screen.video and canvas have same aspect ratio!
      ctx.drawImage(
        screen.video,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    if (camera && camera.video) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(
        (canvas.width - (camera.video.videoWidth / 4)) + 20,
        (canvas.height - (camera.video.videoHeight / 4)) - 15,
        camera.video.videoHeight / 4,
        0,
        2 * Math.PI,
      );
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(
        camera.video,
        (canvas.width - (camera.video.videoWidth / 2)) + 20,
        (canvas.height - (camera.video.videoHeight / 2)) - 15,
        camera.video.videoWidth / 2,
        camera.video.videoHeight / 2,
      );
      ctx.restore();
    }

    if (audio) {
      // update meter??
    }

    window.requestAnimationFrame(this.update);
  }

  getUserMedia(type) {
    if (this.state[type]) {
      return this.setState({ [type]: false });
    }

    navigator.mediaDevices.getUserMedia(sources[type])
      .then((stream) => {
        if (type === 'audio') {
          this.setState({ [type]: createAudioSource(stream) });
        } else {
          this.setState({ [type]: createVideoSource(stream) });
        }
      })
      .catch(error => this.setState({ [type]: { error } }));
  }

  record() {
    if (this.state.isRecording) {
      return;
    }

    const outputStream = new MediaStream();
    const inputStreams = [
      ...(this.state.audio && this.state.audio.stream ? [this.state.audio.stream] : []),
      ...(this.state.camera || this.state.screen ? [this.canvas.captureStream()] : []),
    ];

    inputStreams.forEach(
      stream => stream.getTracks().forEach(
        track => outputStream.addTrack(track),
      ),
    );

    this.recordedBlobs = [];
    this.recorder = new MediaRecorder(outputStream, {
      mimeType: 'video/webm',
      // audioBitsPerSecond : 128000,
      // videoBitsPerSecond : 2500000,
    });

    this.recorder.addEventListener('dataavailable', (e) => {
      if (e.data && e.data.size > 0) {
        this.recordedBlobs.push(e.data);
      }
    });

    this.recorder.start(1000);
    this.setState({ isRecording: true, isPaused: false });
  }

  pause() {
    if (this.state.isPaused) {
      this.recorder.resume();
      this.setState({ isRecording: true, isPaused: false });
    } else {
      this.recorder.pause();
      this.setState({ isRecording: true, isPaused: true });
    }
  }

  stop() {
    this.recorder.stop();

    const blob = new Blob(this.recordedBlobs, { type: 'video/webm' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.webm';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      this.setState({ isRecording: false, isPaused: false });
    }, 100);
  }

  render() {
    const { audio, camera, screen, resolution, isRecording, isPaused } = this.state;
    console.log(resolution);
    return (
      <div style={styles.root}>
        <canvas
          width={resolutions[resolution].width}
          height={resolutions[resolution].height}
          style={styles.canvas}
          ref={(canvas) => { this.canvas = canvas; }}
        ></canvas>
        <div style={styles.toolbar}>
          <select disabled={isRecording} value={resolution} onChange={(e) => this.setState({ resolution: e.target.value })}>
            {Object.keys(resolutions).map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
          <div style={styles.toolbarGroup}>
            <Button text="🎙" active={!!audio} onClick={() => this.getUserMedia('audio')} />
            <Button text="🎥" active={!!camera} onClick={() => this.getUserMedia('camera')} />
            <Button text="💻" active={!!screen} onClick={() => this.getUserMedia('screen')} />
          </div>
          <div style={styles.toolbarGroup}>
            {!isRecording
              ? <Button text="⏺" active={isRecording} onClick={this.record} />
              : <Button text="⏹" active={isRecording} onClick={this.stop} />
            }
            {isRecording && (
              <Button
                text={isPaused ? '▶️' : '⏸️'}
                active={isPaused} onClick={this.pause}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}


export default Studio;
