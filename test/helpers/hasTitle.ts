import { Context } from 'mocha';

export function hasOneOfTitles(
	context: Context,
	...titles: string[]
): boolean {
	const test = context.currentTest;
	if (test) {
		for (let i = 0; i < titles.length; ++i) {
			if (test.title === titles[i]) {
				return true;
			}
		}
	}
	return false;
}
