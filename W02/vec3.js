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