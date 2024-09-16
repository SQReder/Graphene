import { useUnit } from 'effector-react';
import Select from 'react-select';
import type { NamedCleanerSelector } from './model';

export const CleanerSelectorView = <T,>({
	model,
	placeholder,
}: {
	model: NamedCleanerSelector<T>['@@ui'];
	placeholder: string;
}) => {
	const { selectedCleanersChanged, selectedCleaners } = useUnit(model);
	const availableCleaners = model.availableCleaners;

	return (
		<Select
			isMulti
			options={availableCleaners}
			value={selectedCleaners}
			onChange={(e) => selectedCleanersChanged(e)}
			getOptionLabel={(o) => o.name}
			getOptionValue={(o) => o.name}
			closeMenuOnSelect={false}
			hideSelectedOptions={false}
			controlShouldRenderValue={false}
			placeholder={placeholder}
		/>
	);
};
