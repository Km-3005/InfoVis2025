class Vec3 {
	constructor(x, y, z) {
		this.x = x;
		this.y = y;
		this.z = z;
	}

	min() {
		return Math.min(this.x, this.y, this.z);
	}

	mid() {
		const nums = [this.x, this.y, this.z];
		nums.sort();
		return nums[1];
	}

	max() {
		return Math.max(this.x, this.y, this.z);
	}
}

function AreaOfTriangle(VecA, VecB, VecC) {
	const a = Math.sqrt(
		(VecB.x - VecA.x) ** 2 +
		(VecB.y - VecA.y) ** 2 +
		(VecB.z - VecA.z) ** 2
	);
	const b = Math.sqrt(
		(VecC.x - VecB.x) ** 2 +
		(VecC.y - VecB.y) ** 2 +
		(VecC.z - VecB.z) ** 2
	);
	const c = Math.sqrt(
		(VecA.x - VecC.x) ** 2 +
		(VecA.y - VecC.y) ** 2 +
		(VecA.z - VecC.z) ** 2
	);
	const s = (a + b + c) / 2;

	return Math.sqrt(s * (s - a) * (s - b) * (s - c));
}