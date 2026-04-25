import { compareFaceImages } from '../faceMatch';
import type { FaceApiModule } from '../../hooks/useFaceApi';

const FAKE_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

function makeFaceApi(opts: {
  sourceDescriptor: Float32Array | null;
  targetDescriptor: Float32Array | null;
  distance?: number;
}): FaceApiModule {
  return {
    nets: {} as never,
    TinyFaceDetectorOptions: function () {} as never,
    detectSingleFace: jest.fn().mockImplementation(() => ({
      withFaceLandmarks: () => ({
        withFaceDescriptor: jest
          .fn()
          .mockResolvedValueOnce(
            opts.sourceDescriptor
              ? { descriptor: opts.sourceDescriptor }
              : undefined,
          )
          .mockResolvedValueOnce(
            opts.targetDescriptor
              ? { descriptor: opts.targetDescriptor }
              : undefined,
          ),
        run: jest.fn(),
      }),
      run: jest.fn(),
    })),
    euclideanDistance: jest.fn().mockReturnValue(opts.distance ?? 0.5),
  } as unknown as FaceApiModule;
}

beforeEach(() => {
  Object.defineProperty(global, 'Image', {
    writable: true,
    value: class FakeImage {
      onload: () => void = () => {};
      onerror: () => void = () => {};
      crossOrigin = '';
      private _src = '';
      get src() {
        return this._src;
      }
      set src(value: string) {
        this._src = value;
        setTimeout(() => this.onload(), 0);
      }
    },
  });
});

describe('compareFaceImages', () => {
  it('retorna isMatch=true cuando distance < threshold', async () => {
    const desc = new Float32Array(128).fill(0.5);
    const faceapi = makeFaceApi({
      sourceDescriptor: desc,
      targetDescriptor: desc,
      distance: 0.3,
    });
    const result = await compareFaceImages(faceapi, FAKE_DATA_URL, FAKE_DATA_URL);
    expect(result.isMatch).toBe(true);
    expect(result.distance).toBe(0.3);
    expect(result.similarity).toBeGreaterThan(0.4);
  });

  it('retorna isMatch=false cuando distance > threshold', async () => {
    const desc = new Float32Array(128).fill(0.5);
    const faceapi = makeFaceApi({
      sourceDescriptor: desc,
      targetDescriptor: desc,
      distance: 0.8,
    });
    const result = await compareFaceImages(faceapi, FAKE_DATA_URL, FAKE_DATA_URL);
    expect(result.isMatch).toBe(false);
    expect(result.similarity).toBe(0);
  });

  it('retorna sourceDetected=false cuando descriptor source es null', async () => {
    const desc = new Float32Array(128).fill(0.5);
    const faceapi = makeFaceApi({
      sourceDescriptor: null,
      targetDescriptor: desc,
    });
    const result = await compareFaceImages(faceapi, FAKE_DATA_URL, FAKE_DATA_URL);
    expect(result.isMatch).toBe(false);
    expect(result.sourceDetected).toBe(false);
    expect(result.targetDetected).toBe(true);
  });

  it('retorna ambos no detectados si ninguna imagen tiene rostro', async () => {
    const faceapi = makeFaceApi({
      sourceDescriptor: null,
      targetDescriptor: null,
    });
    const result = await compareFaceImages(faceapi, FAKE_DATA_URL, FAKE_DATA_URL);
    expect(result.isMatch).toBe(false);
    expect(result.sourceDetected).toBe(false);
    expect(result.targetDetected).toBe(false);
  });

  it('respeta threshold custom', async () => {
    const desc = new Float32Array(128).fill(0.5);
    const faceapi = makeFaceApi({
      sourceDescriptor: desc,
      targetDescriptor: desc,
      distance: 0.7,
    });
    const result = await compareFaceImages(
      faceapi,
      FAKE_DATA_URL,
      FAKE_DATA_URL,
      0.8,
    );
    expect(result.isMatch).toBe(true);
  });
});
