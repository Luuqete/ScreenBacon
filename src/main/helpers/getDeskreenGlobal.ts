import { ScreenBaconGlobal } from './initGlobals';

export const getDeskreenGlobal = (): ScreenBaconGlobal => {
	return global as unknown as ScreenBaconGlobal;
};
