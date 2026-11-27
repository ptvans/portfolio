// The observer's view of the sky (slides 7–8), computed from the physics of
// scattering in a WebGL shader: Rayleigh scattering by air (1/λ⁴), a little
// haze, and ozone absorption, integrated along each line of sight.

const BR = [5.8e-6, 13.5e-6, 33.1e-6];        // air, at 680 / 550 / 440 nm (per metre)
const BO = [0.650e-6, 1.881e-6, 0.085e-6];    // ozone absorption at its peak
const HAZE = 4e-6;                            // light aerosol scattering
const vec = a => `vec3(${a.map(v => v.toExponential()).join(',')})`;

const VERT = 'attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }';
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform vec3 uSun;
uniform float uPitch;
uniform float uExposure;
const float PI = 3.14159265;
const float R = 6360e3, RA = 6420e3, HR = 8000., HM = 1200.;
const vec3 BR = ${vec(BR)};
const vec3 BO = ${vec(BO)};
const vec3 BM = vec3(${HAZE.toExponential()});

vec2 sphere(vec3 o, vec3 d, float r) {
  float b = dot(o, d), c = dot(o, o) - r * r, h = b * b - c;
  if (h < 0.) return vec2(-1.);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}
vec3 density(float h) {
  return vec3(exp(-h / HR), exp(-h / HM), max(0., 1. - abs(h - 25e3) / 15e3));
}
vec3 sunDepth(vec3 pos) {
  if (sphere(pos, uSun, R).x > 0.) return vec3(-1.);
  float ds = sphere(pos, uSun, RA).y / 8.;
  vec3 od = vec3(0.);
  for (int j = 0; j < 8; j++) od += density(length(pos + uSun * ds * (float(j) + .5)) - R) * ds;
  return od;
}
vec3 extinction(vec3 od) { return exp(-(BR * od.x + BM * 1.1 * od.y + BO * od.z)); }

void main() {
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  vec3 fwd = vec3(0., sin(uPitch), cos(uPitch));
  vec3 right = vec3(1., 0., 0.);
  vec3 up = cross(fwd, right);
  vec3 d = normalize(fwd + (p.x * right + p.y * up) * 2. * tan(radians(42.)));

  vec3 o = vec3(0., R + 2., 0.);
  float tmax = sphere(o, d, RA).y;
  float tg = sphere(o, d, R).x;
  bool ground = tg > 0.;
  if (ground) tmax = tg;

  float mu = dot(d, uSun);
  float pr = 3. / (16. * PI) * (1. + mu * mu);
  float g = .76;
  float pm = 3. / (8. * PI) * ((1. - g*g) * (1. + mu*mu)) / ((2. + g*g) * pow(1. + g*g - 2.*g*mu, 1.5));

  const int N = 24;
  float ds = tmax / float(N);
  vec3 od = vec3(0.), sumR = vec3(0.), sumM = vec3(0.);
  for (int i = 0; i < N; i++) {
    vec3 pos = o + d * ds * (float(i) + .5);
    vec3 dens = density(length(pos) - R) * ds;
    od += dens;
    vec3 sl = sunDepth(pos);
    if (sl.x >= 0.) {
      vec3 att = extinction(od + sl);
      sumR += att * dens.x;
      sumM += att * dens.y;
    }
  }
  float I = 22.;
  vec3 col = I * (sumR * BR * pr + sumM * BM * pm);
  vec3 viewT = extinction(od);
  if (ground) {
    vec3 gp = o + d * tg;
    vec3 sl = sunDepth(gp);
    if (sl.x >= 0.) col += viewT * vec3(.09, .11, .07) * extinction(sl) * max(dot(normalize(gp), uSun), 0.) * I / PI;
  } else if (mu > cos(radians(1.1))) {
    col += I * 40. * viewT;
  }
  col = 1. - exp(-uExposure * col);
  gl_FragColor = vec4(pow(col, vec3(1. / 2.2)), 1.);
}`;

export function createSkyView(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = name => gl.getUniformLocation(prog, name);
  const uRes = u('uRes'), uSun = u('uSun'), uPitch = u('uPitch'), uExposure = u('uExposure');

  let pending = false, elevation = 90;
  function draw() {
    pending = false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    const e = elevation * Math.PI / 180;
    // Look up more when the sun is high, so it stays in view; show the horizon when it's low.
    const pitch = (16 + elevation * 0.4) * Math.PI / 180;
    gl.uniform2f(uRes, w, h);
    gl.uniform3f(uSun, 0, Math.sin(e), Math.cos(e));
    gl.uniform1f(uPitch, pitch);
    // Like our eyes, open up the exposure as the light fades around sunset.
    const dusk = Math.min(Math.max((4 - elevation) / 10, 0), 1);
    gl.uniform1f(uExposure, 1.6 * (1 + dusk * dusk * 14));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return {
    render(deg) {
      elevation = deg;
      if (!pending) { pending = true; requestAnimationFrame(draw); }
    },
  };
}
