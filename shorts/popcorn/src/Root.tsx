import React from 'react';
import {Composition} from 'remotion';
import {Short} from './Short';
import {DURATION, FPS} from './story';

export const Root: React.FC = () => (
	<Composition id="Popcorn" component={Short} width={720} height={1280} fps={FPS} durationInFrames={DURATION} defaultProps={{captions: true, rs: 1}} />
);
