'use client';

import { useState, useEffect, useRef } from 'react';
import { DayPicker } from 'react-day-picker';
import { format, isValid } from 'date-fns';
import { Calendar as CalIcon, Clock, ChevronDown, Check } from 'lucide-react';
import 'react-day-picker/dist/style.css';

const css = `
  .rdp {
    --rdp-cell-size: 36px;
    --rdp-accent-color: #d4af37;
    --rdp-background-color: #171717;
    margin: 0;
  }
  .rdp-day_selected:not([disabled]), .rdp-day_selected:focus:not([disabled]), .rdp-day_selected:active:not([disabled]), .rdp-day_selected:hover:not([disabled]) {
      background-color: var(--rdp-accent-color);
      color: #000;
      font-weight: 600;
  }
  .rdp-day:hover:not([disabled]) {
      background-color: #262626;
      border-radius: 4px;
  }
  .rdp-caption_label {
      color: #e5e5e5;
      font-weight: 500;
      font-family: 'Fira Code', monospace;
  }
  .rdp-head_cell {
      color: #737373;
      font-size: 0.75rem;
      font-weight: 400;
  }
  .rdp-button_reset {
      border-radius: 4px;
  }
  /* Time Column Scrollbar */
  .time-col::-webkit-scrollbar {
    width: 4px;
  }
  .time-col::-webkit-scrollbar-track {
    background: #000;
  }
  .time-col::-webkit-scrollbar-thumb {
    background: #333;
    border-radius: 2px;
  }
`;

export default function DateTimePicker({ value, onChange }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedHour, setSelectedHour] = useState('12');
    const [selectedMinute, setSelectedMinute] = useState('00');
    const [amPm, setAmPm] = useState('AM');

    const containerRef = useRef(null);

    // Initialize
    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (isValid(d)) {
                setSelectedDate(d);
                let hours = d.getHours();
                const period = hours >= 12 ? 'PM' : 'AM';
                setAmPm(period);

                // Convert to 12h format
                hours = hours % 12;
                hours = hours ? hours : 12; // the hour '0' should be '12'
                setSelectedHour(hours.toString().padStart(2, '0'));

                setSelectedMinute(d.getMinutes().toString().padStart(2, '0'));
            }
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const emitChange = (date, hour, minute, period) => {
        if (!date) return;
        const newDate = new Date(date);

        let h = parseInt(hour);
        if (period === 'PM' && h < 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;

        newDate.setHours(h, parseInt(minute));
        onChange(newDate.toISOString());
    };

    const handleDateSelect = (date) => {
        if (!date) return;
        setSelectedDate(date);
        emitChange(date, selectedHour, selectedMinute, amPm);
    };

    const handleTimeSelect = (type, val) => {
        if (type === 'hour') {
            setSelectedHour(val);
            emitChange(selectedDate, val, selectedMinute, amPm);
        } else if (type === 'minute') {
            setSelectedMinute(val);
            emitChange(selectedDate, selectedHour, val, amPm);
        } else {
            setAmPm(val);
            emitChange(selectedDate, selectedHour, selectedMinute, val);
        }
    };

    const handleApply = () => {
        setIsOpen(false);
    };

    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
    const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

    const displayStr = isValid(selectedDate)
        ? `${format(selectedDate, 'MMM d, yyyy')} | ${selectedHour}:${selectedMinute} ${amPm}`
        : 'Select Date & Time';

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', fontFamily: '"Fira Code", monospace' }}>
            <style>{css}</style>

            {/* Custom Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.875rem 1rem',
                    background: '#000',
                    border: isOpen ? '1px solid #d4af37' : '1px solid #1a1a1a',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: '#fff',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 0 0 1px #d4af37' : 'none'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CalIcon size={16} color="#737373" />
                    <span style={{ fontSize: '0.875rem' }}>{displayStr}</span>
                </div>
                <ChevronDown size={16} color="#525252" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
            </div>

            {/* Popover */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    left: 0,
                    zIndex: 50,
                    background: '#000',
                    border: '1px solid #1a1a1a',
                    borderRadius: '8px',
                    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.9)',
                    display: 'flex',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    {/* Calendar Section */}
                    <div style={{ padding: '1rem', borderRight: '1px solid #1a1a1a' }}>
                        <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={handleDateSelect}
                            showOutsideDays
                            fixedWeeks
                            modifiersClassNames={{
                                selected: 'rdp-day_selected'
                            }}
                        />
                    </div>

                    {/* Time Section */}
                    <div style={{ width: '140px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                            padding: '0.75rem',
                            borderBottom: '1px solid #1a1a1a',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: '#e5e5e5',
                            fontSize: '0.75rem',
                            fontWeight: 600
                        }}>
                            <Clock size={14} color="#d4af37" />
                            <span>TIME</span>
                        </div>

                        <div style={{ display: 'flex', flex: 1, height: '240px' }}>
                            {/* Hours */}
                            <div className="time-col" style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #1a1a1a' }}>
                                {hours.map(h => (
                                    <div
                                        key={h}
                                        onClick={() => handleTimeSelect('hour', h)}
                                        style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            background: selectedHour === h ? '#d4af37' : 'transparent',
                                            color: selectedHour === h ? '#000' : '#737373',
                                            transition: 'background 0.1s'
                                        }}
                                    >
                                        {h}
                                    </div>
                                ))}
                            </div>

                            {/* Minutes */}
                            <div className="time-col" style={{ flex: 1, overflowY: 'auto', borderRight: '1px solid #1a1a1a' }}>
                                {minutes.map(m => (
                                    <div
                                        key={m}
                                        onClick={() => handleTimeSelect('minute', m)}
                                        style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer',
                                            background: selectedMinute === m ? '#d4af37' : 'transparent',
                                            color: selectedMinute === m ? '#000' : '#737373',
                                            transition: 'background 0.1s'
                                        }}
                                    >
                                        {m}
                                    </div>
                                ))}
                            </div>

                            {/* AM/PM */}
                            <div className="time-col" style={{ width: '45px', display: 'flex', flexDirection: 'column' }}>
                                {['AM', 'PM'].map(p => (
                                    <div
                                        key={p}
                                        onClick={() => handleTimeSelect('amPm', p)}
                                        style={{
                                            padding: '0.5rem',
                                            textAlign: 'center',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            background: amPm === p ? '#d4af37' : 'transparent',
                                            color: amPm === p ? '#000' : '#737373',
                                            transition: 'all 0.1s',
                                            flex: 1,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {p}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Apply Button */}
                        <div style={{ padding: '0.5rem', borderTop: '1px solid #1a1a1a' }}>
                            <button
                                onClick={handleApply}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    background: '#d4af37',
                                    color: '#000',
                                    border: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: '"Fira Code", monospace'
                                }}
                            >
                                APPLY
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
