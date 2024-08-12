import {makeBaseMediaTrack} from './boxes/iso-base-media/make-track';
import type {MoovBox} from './boxes/iso-base-media/moov/moov';
import {getTracksFromMatroska} from './boxes/webm/get-ready-tracks';
import type {SamplePosition} from './get-sample-positions';
import type {AnySegment} from './parse-result';
import {getFtypBox, getMoovBox, getMvhdBox, getTraks} from './traversal';

type SampleAspectRatio = {
	numerator: number;
	denominator: number;
};

export type VideoTrack = {
	type: 'video';
	samplePositions: SamplePosition[] | null;
	trackId: number;
	description: Uint8Array | null;
	timescale: number;
	codecString: string;
	sampleAspectRatio: SampleAspectRatio;
	width: number;
	height: number;
	untransformedWidth: number;
	untransformedHeight: number;
};

export type AudioTrack = {
	type: 'audio';
	samplePositions: SamplePosition[] | null;
	trackId: number;
	timescale: number;
	codecString: string | null;
};

export type Track = VideoTrack | AudioTrack;

// TODO: Use this to determine if all tracks are present
export const getNumberOfTracks = (moovBox: MoovBox): number => {
	const mvHdBox = getMvhdBox(moovBox);
	if (!mvHdBox) {
		return 0;
	}

	return mvHdBox.nextTrackId - 1;
};

export const hasTracks = (segments: AnySegment[]): boolean => {
	const moovBox = getMoovBox(segments);
	const ftypBox = getFtypBox(segments);

	if (!moovBox) {
		if (ftypBox) {
			return false;
		}

		// TODO: Support Matroska
		return true;
	}

	const numberOfTracks = getNumberOfTracks(moovBox);
	const tracks = getTraks(moovBox);

	return tracks.length === numberOfTracks;
};

export const getTracks = (
	segments: AnySegment[],
): {
	videoTracks: VideoTrack[];
	audioTracks: AudioTrack[];
} => {
	const mainSegment = segments.find((s) => s.type === 'main-segment');
	if (mainSegment && mainSegment.type === 'main-segment') {
		return getTracksFromMatroska(mainSegment);
	}

	const moovBox = getMoovBox(segments);
	if (!moovBox) {
		return {
			videoTracks: [],
			audioTracks: [],
		};
	}

	const videoTracks: VideoTrack[] = [];
	const audioTracks: AudioTrack[] = [];
	const tracks = getTraks(moovBox);

	for (const trakBox of tracks) {
		const track = makeBaseMediaTrack(trakBox);
		if (!track) {
			continue;
		}

		if (track.type === 'video') {
			videoTracks.push(track);
		}

		if (track.type === 'audio') {
			audioTracks.push(track);
		}
	}

	return {
		videoTracks,
		audioTracks,
	};
};
