// language=CSS
const style = `
:host {
    display: inline-block;
}

.header {
    display: flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.2rem;
}

.header-text {
    flex: 1;
}

fieldset {
    margin: 0;
    padding: 0;
    border: 0;
}

button {
    background: transparent;
    border: 1px solid #000;
    border-radius: 4px;
    cursor: pointer;
    width: 2rem;
    line-height: 2rem;
}

button:disabled {
    background: #aaa;
    cursor: not-allowed;
}

table {
    table-layout: fixed;
}

th {
    width: 2rem;
    font-weight: normal;
    font-size: 0.8rem;
}

.week-days button {
    display: block;
}

.week-days button.month-other {
    opacity: 0.5;
}

.week-days button.selected {
    background: var(--accent, #5C6BC0);
    color: var(--text-on-accent, #FFFFFF);
    font-weight: bold;
}

.week-days button:not(.selected):hover {
    background: #ddd;
}

.show-selected {
    text-align: center;
}
`.replace('/\w+/', ' ')

function getFirstDay() {
    const locale = new Intl.Locale(navigator.language)
    let firstDay = 1
    if (locale.hasOwnProperty('weekInfo')) {
        firstDay = locale.weekInfo.firstDay % 7
    } else if (typeof locale.getWeekInfo === 'function') {
        firstDay = locale.getWeekInfo().firstDay % 7
    }
    return firstDay
}

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#date_strings
 *
 * @param {?Date} d
 * @returns {string|null}
 */
function toDateString(d) {
    if (d === null) {
        return null
    }
    return String(d.getFullYear())
        + '-'
        + String(d.getMonth() + 1).padStart(2, '0')
        + '-'
        + String(d.getDate()).padStart(2, '0')
}

const maxDate = new Date(8640000000000000)
const minDate = new Date(-8640000000000000)

/**
 https://developer.mozilla.org/en-US/docs/Web/HTML/Date_and_time_formats#date_strings
 *
 * @param {?string} s
 * @returns {Date|null}
 */
function parseDateString(s) {
    if (s === null) {
        return null
    }
    const [fullYear, month, date] = s.split('-', 3)
        .map(p => parseInt(p, 10))
    if (isNaN(fullYear) || isNaN(month) || isNaN(date)) {
        return null
    }
    const d = new Date(0)
    d.setFullYear(fullYear, month - 1, date)
    return d
}

function createRenderer(shadow) {
    let initialized = false

    let weekDaysEl = null
    let headerTextEl = null
    let prevMonthEl = null, nextMonthEl = null
    let showSelectedEl = null

    const eventRegistry = []

    let prevFocusable = minDate

    function addEventListener(node, type, listener) {
        node.addEventListener(type, listener)
        eventRegistry.push({node, type, listener})
    }

    function refreshMonth(calendar, focusable) {
        if (focusable.getFullYear() === prevFocusable.getFullYear()
            && focusable.getMonth() === prevFocusable.getMonth()) {
            // Do not refresh if not changed
            return
        }

        headerTextEl.innerHTML = calendar.title()

        prevMonthEl.disabled = focusable.getFullYear() < calendar.min.getFullYear() ||
            (focusable.getFullYear() === calendar.min.getFullYear() && focusable.getMonth() <= calendar.min.getMonth())
        nextMonthEl.disabled = focusable.getFullYear() > calendar.max.getFullYear() ||
            (focusable.getFullYear() === calendar.max.getFullYear() && focusable.getMonth() >= calendar.max.getMonth())

        const buttons = weekDaysEl.querySelectorAll('button')

        calendar.weeks().forEach((week, i) => {
            week.forEach((day, j) => {
                const el = buttons.item((i * 7) + j)
                el.value = toDateString(day)
                el.innerHTML = day.getDate()
                el.setAttribute('aria-label', day.toLocaleString())
                if (day.getMonth() === focusable.getMonth()) {
                    el.classList.add('month-current')
                    el.classList.remove('month-other')
                } else {
                    el.classList.remove('month-current')
                    el.classList.add('month-other')
                }
                el.disabled = !calendar.available(day)
            })
        })
    }

    return {
        render(weeks) {
            shadow.innerHTML = `
<style>${style}</style>
<div class="calendar">
    <div class="header">
        <div class="header-text"></div>
        <button type="button" class="prev-month" aria-label="previous month">&lt;</button>
        <button type="button" class="next-month" aria-label="next month">&gt;</button>
    </div>
    <fieldset class="week-days">
        <table>
            <tr>
                ${weeks[0].map(day => (`<th>
                    ${day.toLocaleString(navigator.language, {weekday: 'short'})}
                </th>`)).join('')}
            </tr>
            ${weeks.map(week => (`<tr>
                ${week.map(() => (`<td>
                    <button type="button" tabindex="-1"></button>
                </td>`)).join('')}
            </tr>`)).join('')}
        </table>
    </fieldset>
    <div class="show-selected"></div>
</div>`
        },

        initElements() {
            if (initialized) {
                return
            }

            initialized = true

            prevMonthEl = shadow.querySelector('.prev-month')
            nextMonthEl = shadow.querySelector('.next-month')
            weekDaysEl = shadow.querySelector('.week-days')
            headerTextEl = shadow.querySelector('.header-text')
            showSelectedEl = shadow.querySelector('.show-selected')
        },

        addEventListenerAll({moveFocusable, setValue}) {
            if (!initialized) {
                return
            }

            const moveFocus = (year, month, date) => {
                moveFocusable(year, month, date)

                weekDaysEl.querySelector(`[tabindex="0"]`).focus()
            }

            addEventListener(prevMonthEl, 'click', () => {
                moveFocusable(0, -1, 0)
            })
            addEventListener(prevMonthEl, 'keydown', event => {
                if (event.key !== 'Enter' && event.key !== 'Space') return
                moveFocusable(0, -1, 0)
            })
            addEventListener(nextMonthEl, 'click', () => {
                moveFocusable(0, 1, 0)
            })
            addEventListener(nextMonthEl, 'keydown', event => {
                if (event.key !== 'Enter' && event.key !== 'Space') return
                moveFocusable(0, 1, 0)
            })

            const buttons = weekDaysEl.querySelectorAll('button')
            buttons.forEach((button, index) => {
                addEventListener(button, 'click', () => {
                    if (button.disabled) {
                        return
                    }

                    setValue(button.value)
                })

                addEventListener(button, 'keydown', event => {
                    let found = true

                    if (button.disabled) {
                        return
                    }

                    switch (event.key) {
                        case 'Enter':
                        case 'Space':
                            setValue(button.value)
                            break
                        case 'ArrowUp':
                            moveFocus(0, 0, -7)

                            break
                        case 'ArrowRight':
                            moveFocus(0, 0, 1)

                            weekDaysEl.querySelector(`[tabindex="0"]`).focus()
                            break
                        case 'ArrowDown':
                            moveFocus(0, 0, 7)

                            weekDaysEl.querySelector(`[tabindex="0"]`).focus()
                            break
                        case 'ArrowLeft':
                            moveFocus(0, 0, -1)

                            weekDaysEl.querySelector(`[tabindex="0"]`).focus()
                            break
                        default:
                            found = false
                    }
                    if (found) {
                        event.preventDefault()
                        event.stopPropagation()
                    }
                })
            })
        },

        removeEventListenerAll() {
            if (!initialized) {
                return
            }

            while (eventRegistry.length > 0) {
                const {node, type, listener} = eventRegistry.pop()
                node.removeEventListener(type, listener)
            }
        },

        refresh(calendar, focusable) {
            if (!initialized) {
                return
            }

            refreshMonth(calendar, focusable)

            prevFocusable = focusable

            const selectable = weekDaysEl.querySelector('button[tabindex="0"]')
            if (!selectable || selectable.value !== toDateString(focusable)) {
                if (selectable) {
                    selectable.setAttribute('tabindex', '-1')
                }
                weekDaysEl.querySelector(`[value="${toDateString(focusable)}"]`).setAttribute('tabindex', '0')
            }

            const selected = weekDaysEl.querySelector(`button.selected`)
            if (!selected || selected.value !== toDateString(calendar.selected)) {
                if (selected) {
                    selected.classList.remove('selected')
                }
                if (calendar.selected) {
                    const selectedEl = weekDaysEl.querySelector(`[value="${toDateString(calendar.selected)}"]`)
                    if (selectedEl) {
                        selectedEl.classList.add('selected')
                    }
                }
            }

            if (calendar.selected) {
                showSelectedEl.innerHTML = calendar.selected.toLocaleString(navigator.language, {
                    year: 'numeric', month: 'short', day: 'numeric'
                })
            } else {
                showSelectedEl.innerHTML = ''
            }
        },
    }
}

/**
 * @param {ShadowRoot} shadow
 * @returns {{
 *  unmount(): void,
 *  weeks(): *[],
 *  min: Date,
 *  max: Date,
 *  available(Date): boolean,
 *  refresh(): void,
 *  focusable: Date,
 *  title(): string,
 *  mount({moveFocusable: *, setValue: *}): void,
 *  moveFocusable(*, *, *): void,
 *  selected: Date|null
 * }}
 */
function createCalendar(shadow) {
    let min = minDate, max = maxDate
    let selected = null
    let focusable = new Date(toDateString(new Date()))
    let mounted = false

    const renderer = createRenderer(shadow)

    const calendar = {
        available(date) {
            return min <= date && max >= date
        },

        title() {
            return focusable.toLocaleString(navigator.language, {month: 'long', year: 'numeric'})
        },

        weeks() {
            const firstDay = getFirstDay()
            const start = new Date(focusable)
            start.setDate(1)
            while (start.getDay() !== 1) {
                start.setDate(start.getDate() + firstDay)
            }

            if (focusable.getMonth() === start.getMonth()) {
                start.setDate(start.getDate() - 7)
            }

            const weeks = []
            for (let i = 0; i < 6; i++) {
                weeks.push([])
                for (let j = 0; j < 7; j++) {
                    weeks[i].push(new Date(start))
                    start.setDate(start.getDate() + 1)
                }
            }

            return weeks
        },

        mount({moveFocusable, setValue}) {
            mounted = true

            renderer.initElements()

            renderer.addEventListenerAll({moveFocusable, setValue})
            this.refresh()
        },
        unmount() {
            mounted = false

            renderer.removeEventListenerAll()
        },

        refresh() {
            if (!mounted) {
                return
            }

            if (focusable <= min) {
                focusable = min
            } else if (focusable >= max) {
                focusable = max
            }
            renderer.refresh(this, focusable)
        },

        moveFocusable(year, month, date) {
            const d = new Date(focusable)
            const daysInMonth = new Date(d.getFullYear() + year, d.getMonth() + month + 1, 0).getDate()
            d.setFullYear(
                d.getFullYear() + year,
                d.getMonth() + month,
                Math.min(d.getDate(), daysInMonth) + date,
            )

            this.focusable = d
        },

        get selected() {
            return selected
        },
        set selected(val) {
            selected = val
            focusable = val

            this.refresh()
        },

        get focusable() {
            return focusable
        },
        set focusable(val) {
            focusable = val

            this.refresh()
        },

        get min() {
            return min
        },
        set min(val) {
            min = val ? val : maxDate
        },

        get max() {
            return max
        },
        set max(val) {
            max = val ? val : minDate
        },
    }

    renderer.render(calendar.weeks())

    return calendar
}

/**
 * A symbol to protect access to calendar. I know about "Private properties"
 * but the compatibility for symbols is much better.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties#browser_compatibility
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Symbol#browser_compatibility
 * @type {symbol}
 */
const calendarSymbol = Symbol('calendar')

/**
 * @property {ElementInternals} internals
 * @property {?string} value
 * @property {?string} name
 * @property {Date} displayedMonth
 */
class DatePicker extends HTMLElement {
    static formAssociated = true

    constructor() {
        super()

        this.internals = this.attachInternals()
        this[calendarSymbol] = createCalendar(this.attachShadow({mode: 'open'}))

        this.name = this.getAttribute('name')
        this.min = this.getAttribute('min')
        this.max = this.getAttribute('max')
        this.value = this.getAttribute('value')
    }

    connectedCallback() {
        this[calendarSymbol].mount({
            moveFocusable: (year, month, date) => {
                this[calendarSymbol].moveFocusable(year, month, date)
            },
            setValue: (val) => {
                this.value = val
            },
        })

        if (this._name !== null) {
            const data = new FormData()
            data.set(this._name, this.value)
            this.internals.setFormValue(data, data)
        }
    }

    disconnectedCallback() {
        this[calendarSymbol].unmount()

        if (this._name !== null) {
            const data = new FormData()
            data.set(this._name, this.value)
            this.internals.setFormValue(data, data)
        }
    }

    formStateRestoreCallback(state) {
        this.value = state.get(this.name)
    }

    attributeChangedCallback(name, oldValue, newValue) {
        switch (name) {
            case 'name':
                this.name = newValue
                break
            case 'value':
                this.value = newValue
                break
            case 'min':
                this.min = newValue
                break
            case 'max':
                this.max = newValue
                break
        }
    }

    static get observedAttributes() {
        return ['name', 'value', 'max', 'min']
    }

    get name() {
        return this._name
    }

    set name(value) {
        const data = new FormData()
        if (this._name !== null) {
            data.set(this._name, null)
        }
        if (value !== null) {
            data.set(value, this.value)
        }
        this.internals.setFormValue(data, data)

        this._name = value
    }

    get value() {
        return toDateString(this[calendarSymbol].selected)
    }

    set value(value) {
        this[calendarSymbol].selected = parseDateString(value)

        if (this._name !== null) {
            const data = new FormData()
            data.set(this._name, toDateString(this[calendarSymbol].selected))
            this.internals.setFormValue(data, data)
        }
    }

    set min(value) {
        this[calendarSymbol].min = parseDateString(value)
    }

    set max(value) {
        this[calendarSymbol].max = parseDateString(value)
    }

    get valueAsDate() {
        return this[calendarSymbol].selected
    }

    get valueAsNumber() {
        const d = this.valueAsDate
        if (d === null) {
            return NaN
        }
        return d.getTime()
    }

    displayPrevMonth() {
        this[calendarSymbol].moveFocusable(0, -1, 0)
    }

    displayNextMonth() {
        this[calendarSymbol].moveFocusable(0, 1, 0)
    }

    stepDown(n = 1) {
        this[calendarSymbol].moveFocusable(0, 0, -n)
    }

    stepUp(n = 1) {
        this[calendarSymbol].moveFocusable(0, 0, n)
    }
}

customElements.define('sindra-datepicker', DatePicker)
