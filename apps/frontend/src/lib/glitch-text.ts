import * as THREE from "three";

export interface GlitchTextConfig {
  textA: string;
  textB: string;
  textC: string;
  fontFamily: string;
  tiles?: { x: number; y: number };
  tileDimensions?: { x: number; y: number };
  initialWaitDuration: number;
  allTilesFlipDuration: number;
  singleTileFlipDuration: number;
  waitBetweenFlipsDuration: number;
  finalWaitDuration: number;
  invertThreshold: number;
  resizeDebounceMs: number;
}

const DEFAULTS = {
  fontFamily: "Cormorant Garamond",
  tileDimensions: { x: 8, y: 8 },
  initialWaitDuration: 0.2,
  allTilesFlipDuration: 0.5,
  singleTileFlipDuration: 0.1,
  waitBetweenFlipsDuration: 0.3,
  finalWaitDuration: 0.2,
  invertThreshold: 0.0,
  resizeDebounceMs: 100,
} satisfies Partial<GlitchTextConfig>;

// Magic type: keys in DEFAULTS are optional, others are required
export type GlitchTextOptions = Omit<GlitchTextConfig, keyof typeof DEFAULTS> &
  Partial<Pick<GlitchTextConfig, keyof typeof DEFAULTS>>;

interface Uniforms {
  // biome-ignore lint/suspicious/noExplicitAny: THREE.IUniform uses any in its definition
  [uniform: string]: THREE.IUniform<any>;
  uTime: THREE.IUniform<number>;
  uMorphProgress: THREE.IUniform<number>;
  uResolution: THREE.IUniform<THREE.Vector2>;
  uTexA: THREE.IUniform<THREE.Texture>;
  uTexB: THREE.IUniform<THREE.Texture>;
  uTexC: THREE.IUniform<THREE.Texture>;
  uPresenceA: THREE.IUniform<THREE.DataTexture>;
  uPresenceB: THREE.IUniform<THREE.DataTexture>;
  uPresenceC: THREE.IUniform<THREE.DataTexture>;
  uTiles: THREE.IUniform<THREE.Vector2>;
  uInitialWaitDuration: THREE.IUniform<number>;
  uAllTilesFlipDuration: THREE.IUniform<number>;
  uSingleTileFlipDuration: THREE.IUniform<number>;
  uWaitBetweenFlipsDuration: THREE.IUniform<number>;
  uFinalWaitDuration: THREE.IUniform<number>;
  uInvertThreshold: THREE.IUniform<number>;
}

function validateConfig(config: GlitchTextConfig): void {
  if (config.singleTileFlipDuration > config.allTilesFlipDuration) {
    throw new Error(
      `singleTileFlipDuration (${config.singleTileFlipDuration}) must be ≤ allTilesFlipDuration (${config.allTilesFlipDuration})`,
    );
  }
  if (config.allTilesFlipDuration <= 0) {
    throw new Error(`allTilesFlipDuration must be > 0`);
  }
  if (config.singleTileFlipDuration <= 0) {
    throw new Error(`singleTileFlipDuration must be > 0`);
  }
  if (config.invertThreshold < 0 || config.invertThreshold > 1) {
    throw new Error(`invertThreshold must be between 0 and 1`);
  }

  if (config.tiles && (config.tiles.x < 1 || config.tiles.y < 1)) {
    throw new Error(`tiles must be at least 1x1`);
  }

  if (config.tileDimensions && (config.tileDimensions.x <= 0 || config.tileDimensions.y <= 0)) {
    throw new Error(`tileDimensions must be > 0 in both dimensions`);
  }

  if (config.tiles && config.tileDimensions) {
    throw new Error(`Cannot specify both 'tiles' and 'tileDimensions'. Provide only one.`);
  }
}

export class GlitchText {
  private scene!: THREE.Scene;
  private camera!: THREE.OrthographicCamera;
  private renderer!: THREE.WebGLRenderer;
  private uniforms!: Uniforms;
  private material!: THREE.ShaderMaterial;
  private mesh!: THREE.Mesh;
  private morphProgress: number = 0;
  private direction: number = 0;
  private totalElapsedTime: number = 0;
  private lastFrameTime: number = 0;
  private animationFrame: number | null = null;
  private config: GlitchTextConfig;
  private resizeTimeout: number | null = null;
  private tiles: { x: number; y: number };
  private useTileDimensions: boolean;

  constructor(canvas: HTMLCanvasElement, options: GlitchTextOptions) {
    const { width, height } = this.getCanvasSize(canvas);

    this.config = { ...DEFAULTS, ...options };
    validateConfig(this.config);

    this.useTileDimensions = !!this.config.tileDimensions;

    this.tiles = this.calculateTiles(width, height);

    this.initScene();
    this.initRenderer(canvas, width, height);
    this.initResources(width, height);

    this.lastFrameTime = performance.now();
    this.animate();
  }

  private calculateTiles(width: number, height: number): { x: number; y: number } {
    if (this.config.tiles) {
      return this.config.tiles;
    }

    if (this.config.tileDimensions) {
      const tilesX = Math.max(1, Math.floor(width / this.config.tileDimensions.x));
      const tilesY = Math.max(1, Math.floor(height / this.config.tileDimensions.y));
      return { x: tilesX, y: tilesY };
    }

    return { x: 1, y: 1 };
  }

  private getCanvasSize(canvas: HTMLCanvasElement): { width: number; height: number } {
    return {
      width: canvas.clientWidth,
      height: canvas.clientHeight,
    };
  }

  private initScene(): void {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  private initRenderer(canvas: HTMLCanvasElement, width: number, height: number): void {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }

  private initResources(width: number, height: number): void {
    const canvases = this.createTextCanvases(width, height);
    const textures = this.createAllTextures(canvases);
    const presenceTextures = this.createAllPresenceTextures(canvases);
    this.uniforms = this.createUniforms(textures, presenceTextures, width, height);
    this.material = this.createMaterial();
    this.mesh = this.createMesh();
    this.scene.add(this.mesh);
  }

  private get totalDuration(): number {
    return (
      this.config.initialWaitDuration +
      this.config.allTilesFlipDuration +
      this.config.waitBetweenFlipsDuration +
      this.config.allTilesFlipDuration +
      this.config.finalWaitDuration
    );
  }

  private createTextCanvases(
    width: number,
    height: number,
  ): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
    return [
      this.createTextCanvas(this.config.textA, width, height),
      this.createTextCanvas(this.config.textB, width, height),
      this.createTextCanvas(this.config.textC, width, height),
    ];
  }

  private createAllTextures(
    canvases: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement],
  ): [THREE.Texture, THREE.Texture, THREE.Texture] {
    return [
      this.createTextTexture(canvases[0]),
      this.createTextTexture(canvases[1]),
      this.createTextTexture(canvases[2]),
    ];
  }

  private createAllPresenceTextures(
    canvases: [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement],
  ): [THREE.DataTexture, THREE.DataTexture, THREE.DataTexture] {
    return [
      this.createPresenceTexture(canvases[0]),
      this.createPresenceTexture(canvases[1]),
      this.createPresenceTexture(canvases[2]),
    ];
  }

  private createUniforms(
    textures: [THREE.Texture, THREE.Texture, THREE.Texture],
    presenceTextures: [THREE.DataTexture, THREE.DataTexture, THREE.DataTexture],
    width: number,
    height: number,
  ): Uniforms {
    return {
      uTime: { value: 0 },
      uMorphProgress: { value: 0 },
      uResolution: { value: new THREE.Vector2(width, height) },
      uTexA: { value: textures[0] },
      uTexB: { value: textures[1] },
      uTexC: { value: textures[2] },
      uPresenceA: { value: presenceTextures[0] },
      uPresenceB: { value: presenceTextures[1] },
      uPresenceC: { value: presenceTextures[2] },
      uTiles: { value: new THREE.Vector2(this.tiles.x, this.tiles.y) },
      uInitialWaitDuration: { value: this.config.initialWaitDuration },
      uAllTilesFlipDuration: { value: this.config.allTilesFlipDuration },
      uSingleTileFlipDuration: { value: this.config.singleTileFlipDuration },
      uWaitBetweenFlipsDuration: { value: this.config.waitBetweenFlipsDuration },
      uFinalWaitDuration: { value: this.config.finalWaitDuration },
      uInvertThreshold: { value: this.config.invertThreshold },
    };
  }

  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader(),
      uniforms: this.uniforms,
      transparent: true,
    });
  }

  private createMesh(): THREE.Mesh {
    const geometry = new THREE.PlaneGeometry(2, 2);
    return new THREE.Mesh(geometry, this.material);
  }

  private createTextCanvas(text: string, width: number, height: number): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    // biome-ignore lint/style/noNonNullAssertion: canvas context is guaranteed in browser environment
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const ink =
      getComputedStyle(document.documentElement).getPropertyValue("--color-ink").trim() ||
      "#000000";
    ctx.fillStyle = ink;
    ctx.font = `italic ${this.getFontSize(width)}px ${this.config.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, width / 2, height / 2);

    return canvas;
  }

  /**
   * Calculate the font size based on the width of the canvas.
   * Similar clamping to that of the big Hero text:
   * - Minimum font size: 24px (half what in big Hero text).
   * - Maximum font size: 96px (same as in big Hero text).
   * - Font size calculation: width * 0.04375 (7/8 of the big Hero text).
   */
  private getFontSize(width: number): number {
    return Math.min(Math.max(24, width * 0.04375), 96);
  }

  private createTextTexture(canvas: HTMLCanvasElement): THREE.Texture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  private createPresenceTexture(canvas: HTMLCanvasElement): THREE.DataTexture {
    // biome-ignore lint/style/noNonNullAssertion: canvas context is guaranteed in browser environment
    const ctx = canvas.getContext("2d")!;
    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const presenceData = new Uint8Array(this.tiles.x * this.tiles.y);

    const tileWidth = width / this.tiles.x;
    const tileHeight = height / this.tiles.y;

    for (let tileY = 0; tileY < this.tiles.y; tileY++) {
      for (let tileX = 0; tileX < this.tiles.x; tileX++) {
        const hasText = this.scanTileForText(
          pixels,
          width,
          height,
          tileX,
          tileY,
          tileWidth,
          tileHeight,
        );
        presenceData[tileY * this.tiles.x + tileX] = hasText ? 255 : 0;
      }
    }

    const texture = new THREE.DataTexture(
      presenceData,
      this.tiles.x,
      this.tiles.y,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );
    texture.needsUpdate = true;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.flipY = true;

    return texture;
  }

  private scanTileForText(
    pixels: Uint8ClampedArray,
    canvasWidth: number,
    canvasHeight: number,
    tileX: number,
    tileY: number,
    tileWidth: number,
    tileHeight: number,
  ): boolean {
    const startX = Math.floor(tileX * tileWidth);
    const startY = Math.floor(tileY * tileHeight);
    const endX = Math.min(startX + Math.ceil(tileWidth), canvasWidth);
    const endY = Math.min(startY + Math.ceil(tileHeight), canvasHeight);

    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const index = (y * canvasWidth + x) * 4;
        const alpha = pixels[index + 3];

        if (alpha > 0) {
          return true;
        }
      }
    }

    return false;
  }

  private getVertexShader(): string {
    return `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      uniform float uTime;
      uniform float uMorphProgress;
      uniform vec2 uResolution;
      uniform sampler2D uTexA;
      uniform sampler2D uTexB;
      uniform sampler2D uTexC;
      uniform sampler2D uPresenceA;
      uniform sampler2D uPresenceB;
      uniform sampler2D uPresenceC;
      uniform vec2 uTiles;
      uniform float uInitialWaitDuration;
      uniform float uAllTilesFlipDuration;
      uniform float uSingleTileFlipDuration;
      uniform float uWaitBetweenFlipsDuration;
      uniform float uFinalWaitDuration;
      uniform float uInvertThreshold;

      varying vec2 vUv;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec2 uv = vUv;
        vec2 tileUV = floor(uv * uTiles) / uTiles;
        float noise = random(tileUV);

        float totalDuration = uInitialWaitDuration + 2.0 * uAllTilesFlipDuration + uWaitBetweenFlipsDuration + uFinalWaitDuration;

        float initialWaitEnd = uInitialWaitDuration / totalDuration;
        float flipABEnd = (uInitialWaitDuration + uAllTilesFlipDuration) / totalDuration;
        float waitBetweenEnd = (uInitialWaitDuration + uAllTilesFlipDuration + uWaitBetweenFlipsDuration) / totalDuration;
        float flipBCEnd = (uInitialWaitDuration + uAllTilesFlipDuration + uWaitBetweenFlipsDuration + uAllTilesFlipDuration) / totalDuration;

        float morphProgress = uMorphProgress;

        float flipProgress = 0.0;
        vec4 tex1, tex2;

        float hasTextSource, hasTextTarget;
        vec2 presenceUV = (floor(vUv * uTiles) + 0.5) / uTiles;

        if (morphProgress < initialWaitEnd) {
          tex1 = texture2D(uTexA, vUv);
          tex2 = tex1;
          hasTextSource = texture2D(uPresenceA, presenceUV).r;
        } else if (morphProgress < flipABEnd) {
          float phaseProgress = (morphProgress - initialWaitEnd) / (flipABEnd - initialWaitEnd);
          float flipStartTime = noise * (uAllTilesFlipDuration - uSingleTileFlipDuration) / uAllTilesFlipDuration;
          float flipWindowStart = flipStartTime;
          float flipWindowEnd = flipStartTime + uSingleTileFlipDuration / uAllTilesFlipDuration;
          flipProgress = smoothstep(flipWindowStart, flipWindowEnd, phaseProgress);
          tex1 = texture2D(uTexA, vUv);
          tex2 = texture2D(uTexB, vUv);
          hasTextSource = texture2D(uPresenceA, presenceUV).r;
          hasTextTarget = texture2D(uPresenceB, presenceUV).r;
        } else if (morphProgress < waitBetweenEnd) {
          tex1 = texture2D(uTexB, vUv);
          tex2 = tex1;
          hasTextSource = texture2D(uPresenceB, presenceUV).r;
        } else if (morphProgress < flipBCEnd) {
          float phaseProgress = (morphProgress - waitBetweenEnd) / (flipBCEnd - waitBetweenEnd);
          float flipStartTime = noise * (uAllTilesFlipDuration - uSingleTileFlipDuration) / uAllTilesFlipDuration;
          float flipWindowStart = flipStartTime;
          float flipWindowEnd = flipStartTime + uSingleTileFlipDuration / uAllTilesFlipDuration;
          flipProgress = smoothstep(flipWindowStart, flipWindowEnd, phaseProgress);
          tex1 = texture2D(uTexB, vUv);
          tex2 = texture2D(uTexC, vUv);
          hasTextSource = texture2D(uPresenceB, presenceUV).r;
          hasTextTarget = texture2D(uPresenceC, presenceUV).r;
        } else {
          tex1 = texture2D(uTexC, vUv);
          tex2 = tex1;
          hasTextSource = texture2D(uPresenceC, presenceUV).r;
        }

        float hasText = max(hasTextSource, hasTextTarget);
        float invert = step(uInvertThreshold, noise) * flipProgress * hasText;

        if (invert > 0.5) {
          vec3 invertedColor = vec3(0.0);
          float invertedAlpha = 1.0 - tex1.a;
          tex1 = vec4(invertedColor, invertedAlpha);
        }

        vec4 finalColor = mix(tex1, tex2, flipProgress);
        gl_FragColor = finalColor;
      }
    `;
  }

  private animate = () => {
    this.animationFrame = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    if (this.direction !== 0) {
      this.totalElapsedTime += deltaTime * this.direction;
      this.totalElapsedTime = Math.max(0, Math.min(this.totalDuration, this.totalElapsedTime));
      this.morphProgress = this.totalElapsedTime / this.totalDuration;

      this.uniforms.uMorphProgress.value = this.morphProgress;
    }

    this.uniforms.uTime.value += 0.016;
    this.renderer.render(this.scene, this.camera);
  };

  setHover(hover: boolean): void {
    const newDirection = hover ? 1 : -1;

    if (newDirection !== this.direction) {
      this.direction = newDirection;
    }
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.uniforms.uResolution.value.set(width, height);

    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);

    this.resizeTimeout = setTimeout(() => {
      if (this.useTileDimensions) {
        this.tiles = this.calculateTiles(width, height);
        this.uniforms.uTiles.value.set(this.tiles.x, this.tiles.y);
      }
      this.updateTextures(width, height);
    }, this.config.resizeDebounceMs);
  }

  private updateTextures(width: number, height: number): void {
    this.uniforms.uTexA.value.dispose();
    this.uniforms.uTexB.value.dispose();
    this.uniforms.uTexC.value.dispose();
    this.uniforms.uPresenceA.value.dispose();
    this.uniforms.uPresenceB.value.dispose();
    this.uniforms.uPresenceC.value.dispose();

    const canvases = this.createTextCanvases(width, height);
    const textures = this.createAllTextures(canvases);
    const presenceTextures = this.createAllPresenceTextures(canvases);

    this.uniforms.uTexA.value = textures[0];
    this.uniforms.uTexB.value = textures[1];
    this.uniforms.uTexC.value = textures[2];
    this.uniforms.uPresenceA.value = presenceTextures[0];
    this.uniforms.uPresenceB.value = presenceTextures[1];
    this.uniforms.uPresenceC.value = presenceTextures[2];
  }

  destroy(): void {
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    if (this.resizeTimeout) clearTimeout(this.resizeTimeout);

    this.uniforms.uTexA.value.dispose();
    this.uniforms.uTexB.value.dispose();
    this.uniforms.uTexC.value.dispose();
    this.uniforms.uPresenceA.value.dispose();
    this.uniforms.uPresenceB.value.dispose();
    this.uniforms.uPresenceC.value.dispose();

    this.renderer.dispose();
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
