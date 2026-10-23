'use strict';

import quadVert from '../glsl/quad.vert';
import copyFrag from '../glsl/copy.frag';
import positionVert from '../glsl/position.vert';
import positionFrag from '../glsl/position.frag';
import heightFrag from '../glsl/height.frag';
import skyFrag from '../glsl/sky.frag';
import shadowFrag from '../glsl/shadow.frag';
import normalFrag from '../glsl/normal.frag';
import pmediaFrag from '../glsl/pmedia.frag';
import diffuseFrag from '../glsl/diffuse.frag';
import aoFrag from '../glsl/ao.frag';
import directFrag from '../glsl/direct.frag';
import composeFrag from '../glsl/compose.frag';

export default function createCommands(regl) {

  const cmd = {};

  cmd.copy = regl({
    vert: quadVert,
    frag: copyFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {tSource: regl.prop('source')},
    viewport: regl.prop('vpScreen'),
    depth: {enable: false},
    framebuffer: regl.prop('destination')
  });

  cmd.position = regl({
    vert: positionVert,
    frag: positionFrag,
    attributes: {
      position: regl.prop('position')
    },
    elements: regl.prop('elements'),
    uniforms: {
      model: regl.prop('model'),
      view: regl.prop('view'),
      projection: regl.prop('projection'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      height: regl.prop('height'),
      scale: regl.prop('scale')
    },
    viewport: regl.prop('vpScreen'),
    cull: {
      enable: true,
      face: 'back',
    },
    depth: {enable: true},
    framebuffer: regl.prop('destination')
  });

  cmd.height = regl({
    vert: quadVert,
    frag: heightFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      scale: regl.prop('scale'),
      height: regl.prop('height'),
      dist: regl.prop('horizon'),
      origin: regl.prop('origin')
    },
    viewport: regl.prop('vpHmap'),
    depth: {enable: false},
    framebuffer: regl.prop('destination')
  });

  cmd.sky = regl({
    vert: quadVert,
    frag: skyFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      _invpv: regl.prop('_invpv'),
      sunDir: regl.prop('sunDir')
    },
    viewport: regl.prop('vpSky'),
    depth: {enable: false},
    framebuffer: regl.prop('destination')
  });

  cmd.shadow = regl({
    vert: quadVert,
    frag: shadowFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tHeight: regl.prop('tHeight'),
      sunDir: regl.prop('sunDir'),
      horizon: regl.prop('horizon')
    },
    viewport: regl.prop('vpHmap'),
    depth: {enable: false},
    framebuffer: regl.prop('destination'),
    scissor: {enable: true, box: regl.prop('scissorbox')}
  });

  cmd.normal = regl({
    vert: quadVert,
    frag: normalFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tPosition: regl.prop('tPosition'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      scale: regl.prop('scale'),
      height: regl.prop('height')
    },
    viewport: regl.prop('vpScreen'),
    depth: {enable: false},
    framebuffer: regl.prop('destination'),
    scissor: {enable: true, box: regl.prop('scissorbox')}
  });

  cmd.media = regl({
    vert: quadVert,
    frag: pmediaFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tPosition: regl.prop('tPosition'),
      tSky: regl.prop('tSky'),
      tShadow: regl.prop('tShadow'),
      invpv: regl.prop('invpv'),
      sunDir: regl.prop('sunDir'),
      campos: regl.prop('campos'),
      horizon: regl.prop('horizon'),
      fog: regl.prop('fog'),
      groundFog: regl.prop('groundFog'),
      groundFogAlt: regl.prop('groundFogAlt')
    },
    viewport: regl.prop('vpScreen'),
    depth: {enable: false},
    framebuffer: regl.prop('destination'),
    scissor: {enable: true, box: regl.prop('scissorbox')}
  });

  cmd.diffuse = regl({
    vert: quadVert,
    frag: diffuseFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tPosition: regl.prop('tPosition'),
      tNormal: regl.prop('tNormal'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      highFlat0: regl.prop('highFlat0'),
      highFlat1: regl.prop('highFlat1'),
      highSteep0: regl.prop('highSteep0'),
      highSteep1: regl.prop('highSteep1'),
      lowFlat0: regl.prop('lowFlat0'),
      lowFlat1: regl.prop('lowFlat1'),
      lowSteep0: regl.prop('lowSteep0'),
      lowSteep1: regl.prop('lowSteep1')
    },
    viewport: regl.prop('vpScreen'),
    depth: {enable: false},
    framebuffer: regl.prop('destination')
  });

  cmd.ao = regl({
    vert: quadVert,
    frag: aoFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tSky: regl.prop('tSky'),
      tPosition: regl.prop('tPosition'),
      tNormal: regl.prop('tNormal'),
      tAOSampling: regl.prop('tAOSampling'),
      tAOSamplingSize: regl.prop('tAOSamplingSize'),
      tNoise: regl.prop('tNoise'),
      tNoiseSize: regl.prop('tNoiseSize'),
      scale: regl.prop('scale'),
      height: regl.prop('height')
    },
    viewport: regl.prop('vpScreen'),
    depth: {enable: false},
    framebuffer: regl.prop('destination'),
    scissor: {enable: true, box: regl.prop('scissorbox')}
  });

  cmd.direct = regl({
    vert: quadVert,
    frag: directFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tSky: regl.prop('tSky'),
      tPosition: regl.prop('tPosition'),
      tNormal: regl.prop('tNormal'),
      tHeight: regl.prop('tHeight'),
      tShadow: regl.prop('tShadow'),
      horizon: regl.prop('horizon'),
      sunDir: regl.prop('sunDir')
    },
    viewport: regl.prop('vpScreen'),
    depth: {enable: false},
    framebuffer: regl.prop('destination')
  });

  cmd.compose = regl({
    vert: quadVert,
    frag: composeFrag,
    attributes: {position: [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]},
    count: 6,
    uniforms: {
      tSky: regl.prop('tSky'),
      tPosition: regl.prop('tPosition'),
      tDirect: regl.prop('tDirect'),
      tAO: regl.prop('tAO'),
      tDiffuse: regl.prop('tDiffuse'),
      tMedia: regl.prop('tMedia'),
      invpv: regl.prop('invpv'),
      sunDir: regl.prop('sunDir')
    },
    viewport: regl.prop('vpScreen'),
    depth: {enable: false},
    framebuffer: regl.prop('destination')
  });

  return cmd;
}
