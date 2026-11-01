import { MeshGradient } from '@paper-design/shaders-react';
import { Component, useEffect, useState, type ReactNode } from 'react';

// The backdrop behind the demo: a slow mesh gradient in the page's colors
// (Paper Shaders, WebGL). Still for people who ask for less motion; the CSS
// gradient under it shows if WebGL is not available.
const COLORS = ['#16131f', '#2a2148', '#6f58c9', '#9c86e0', '#d6a24c', '#1b1726'];

function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function MovingGradient() {
  const [still, setStill] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setStill(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return (
    <MeshGradient
      className="stage-shader"
      aria-hidden="true"
      colors={COLORS}
      distortion={0.85}
      swirl={0.45}
      grainMixer={0.12}
      grainOverlay={0.06}
      speed={still ? 0 : 0.22}
      maxPixelCount={1920 * 1080}
    />
  );
}

// No WebGL 2 (an old browser, a locked-down machine): the shader throws. The
// stage keeps its CSS gradient instead of taking the page down with it.
class Fallback extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function StageShader() {
  return (
    <Fallback>
      <MovingGradient />
    </Fallback>
  );
}
