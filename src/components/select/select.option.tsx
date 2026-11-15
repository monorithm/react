// An option of the list of the Select (contract: ir/contracts/select.json). Base UI gives the role option, the
// selected state, the active state, and the press. The name and the description give the accessible name and the
// accessible description of the option.
import { Select as Base } from '@base-ui/react/select'
import { useId } from 'react'
import { SelectCheck } from './select.icons'
import { selectCheck, selectDescription, selectOption, selectOptionName, selectOptionText } from './select.variants'

/** One option of a Select. */
export interface SelectOption {
  /** The value that the form sends (select/form). */
  value: string
  /** The name of the option. Typeahead finds an option by its name (select/typeahead). */
  label: string
  /** A second line. For a disabled option, the cause: "Not available in your area at this time" (select/disabled-option). */
  description?: string
  /** The user cannot select a disabled option. The arrow keys can move to it (select/disabled-option). */
  disabled?: boolean
}

export function SelectItem({ option }: { option: SelectOption }) {
  const nameId = useId()
  const descriptionId = useId()
  return (
    <Base.Item
      value={option.value}
      label={option.label}
      disabled={option.disabled}
      aria-labelledby={nameId}
      aria-describedby={option.description ? descriptionId : undefined}
      data-part="option"
      className={selectOption}
    >
      <div className={selectOptionText}>
        <Base.ItemText id={nameId} data-part="name" className={selectOptionName}>
          {option.label}
        </Base.ItemText>
        {option.description ? (
          <span id={descriptionId} data-part="description" className={selectDescription}>
            {option.description}
          </span>
        ) : null}
      </div>
      {/* select/selected-sign and select/direction: the check is at the end side of the selected option. */}
      <Base.ItemIndicator data-part="check" className={selectCheck}>
        <SelectCheck />
      </Base.ItemIndicator>
    </Base.Item>
  )
}
