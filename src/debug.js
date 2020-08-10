const NT_RACE = {
	progress: { },
	export: () => JSON.stringify(NT_RACE)
};

export function addProgress(data) {
	NT_RACE.progress[data.id] = NT_RACE.progress[data.id] || [ ]
	NT_RACE.progress[data.id].push(data);
}

window.NT_RACE = NT_RACE;