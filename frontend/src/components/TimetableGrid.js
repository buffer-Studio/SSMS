const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

const TimetableGrid = ({ schedules, breakAfter, onCellClick, onEmptyCellClick, isRecentChange, isAdmin, showAsTemporary }) => {
  const getScheduleForCell = (day, period) => {
    return schedules.find(s => s.day === day && s.period === period);
  };

  const isBreakPeriod = (period) => {
    return period === breakAfter + 0.5;
  };

  const handleCellClick = (schedule, day, period) => {
    if (schedule && onCellClick) {
      onCellClick(schedule);
    } else if (!schedule && onEmptyCellClick && isAdmin) {
      onEmptyCellClick(day, period);
    }
  };

  const renderPeriods = () => {
    const periodsWithBreak = [];
    PERIODS.forEach(p => {
      periodsWithBreak.push(p);
      if (p === breakAfter) {
        periodsWithBreak.push(p + 0.5); // Break indicator
      }
    });
    return periodsWithBreak;
  };

  const periods = renderPeriods();

  // Get teacher color based on teacher name (consistent colors)
  const getTeacherColor = (teacherName) => {
    if (!teacherName) return 'bg-gray-100 dark:bg-gray-800';
    const colors = [
      'bg-green-100 dark:bg-blue-900/40 border-green-200 dark:border-blue-800',
      'bg-green-100 dark:bg-green-900/40 border-green-200 dark:border-green-800',
      'bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800',
      'bg-pink-100 dark:bg-pink-900/40 border-pink-200 dark:border-pink-800',
      'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800',
      'bg-teal-100 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800',
      'bg-orange-100 dark:bg-orange-900/40 border-orange-200 dark:border-orange-800',
      'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-200 dark:border-cyan-800'
    ];
    const index = teacherName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-gray-100 dark:scrollbar-track-gray-800">
      <div className="min-w-[800px] w-full">
        <div
          className="timetable-grid shadow-lg rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
          style={{
            gridTemplateColumns: `100px repeat(${periods.length}, minmax(70px, 1fr))`
          }}
        >
          {/* Header row */}
          <div className="timetable-cell font-bold text-center bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-b-2 border-slate-300 dark:border-slate-600">
            <span className="text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wide">Day/Period</span>
          </div>
          {periods.map(period => (
            <div
              key={period}
              className={`timetable-cell font-bold text-center border-b-2 border-slate-300 dark:border-slate-600 ${
                isBreakPeriod(period)
                  ? 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30'
                  : 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700'
              }`}
            >
              <span className={`text-sm uppercase tracking-wide ${
                isBreakPeriod(period)
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-slate-700 dark:text-slate-300'
              }`}>
                {isBreakPeriod(period) ? '☕ Break' : `Period ${period}`}
              </span>
            </div>
          ))}

          {/* Day rows */}
          {DAYS.map(day => (
            <div key={day} className="contents">
              <div
                className="timetable-cell font-bold bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 border-r-2 border-slate-300 dark:border-slate-600"
              >
                <span className="text-slate-700 dark:text-slate-300 text-sm uppercase tracking-wide">{day.slice(0, 3)}</span>
              </div>
              {periods.map(period => {
                if (isBreakPeriod(period)) {
                  return (
                    <div
                      key={`${day}-break`}
                      className="timetable-cell bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 flex items-center justify-center border border-amber-200 dark:border-amber-800"
                    >
                      <div className="text-center">
                        <span className="text-lg">☕</span>
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-medium mt-1">Break Time</p>
                      </div>
                    </div>
                  );
                }

                const schedule = getScheduleForCell(day, period);
                const isRecent = schedule && isRecentChange && isRecentChange(schedule.updated_at);
                const teacherColor = schedule ? getTeacherColor(schedule.teacher_name) : '';
                const isTemporary = schedule && schedule.valid_until; // Temporary schedules have valid_until field

                return (
                  <div
                    key={`${day}-${period}`}
                    onClick={() => handleCellClick(schedule, day, period)}
                    className={`timetable-cell transition-all duration-200 border border-gray-200 dark:border-gray-700 ${
                      schedule
                        ? `cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:z-10 ${teacherColor} ${
                            isTemporary ? 'border-orange-400 border-2' : 'border-2'
                          }`
                        : isAdmin
                        ? 'cursor-pointer hover:bg-green-50 dark:hover:bg-blue-900/20 hover:border-green-300 dark:hover:border-blue-600'
                        : 'bg-gray-50 dark:bg-gray-900/50'
                    } ${
                      isRecent ? 'schedule-change ring-2 ring-orange-400' : ''
                    }`}
                    data-testid={`cell-${day}-${period}`}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCellClick(schedule, day, period);
                      }
                    }}
                    aria-label={schedule
                      ? `${schedule.subject} - ${schedule.class_name} with ${schedule.teacher_name}`
                      : isAdmin
                      ? `Add schedule for ${day}, Period ${period}`
                      : `Free period on ${day}, Period ${period}`
                    }
                  >
                    {schedule ? (
                      <div className="space-y-2 p-2">
                        <div className="text-center">
                          <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">
                            {schedule.subject}
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 font-medium mt-1">
                            {schedule.class_name}
                          </p>
                          {!isAdmin && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {schedule.teacher_name}
                            </p>
                          )}
                        </div>
                        {isRecent && (
                          <div className="flex justify-center">
                            <span className="inline-flex items-center px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded-full shadow-sm">
                              <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></span>
                              Updated
                            </span>
                          </div>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <div className="flex flex-col items-center justify-center h-full text-gray-400 hover:text-green-500 dark:hover:text-blue-400 transition-colors">
                        <div className="w-8 h-8 rounded-full border-2 border-dashed border-current flex items-center justify-center mb-1">
                          <span className="text-lg font-light">+</span>
                        </div>
                        <span className="text-xs font-medium">Add Class</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <span className="text-xs text-gray-400 dark:text-gray-600 font-medium">Free</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-green-100 to-green-200 dark:from-blue-900/40 dark:to-blue-800 rounded border border-green-300 dark:border-blue-700"></div>
            <span className="text-gray-600 dark:text-gray-400">Sagnik Sir</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800 rounded border border-green-300 dark:border-green-700"></div>
            <span className="text-gray-600 dark:text-gray-400">Nadeem Sir</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800 rounded border border-purple-300 dark:border-purple-700"></div>
            <span className="text-gray-600 dark:text-gray-400">Prinshu Sir</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-pink-100 to-pink-200 dark:from-pink-900/40 dark:to-pink-800 rounded border border-pink-300 dark:border-pink-700"></div>
            <span className="text-gray-600 dark:text-gray-400">Abhishek Sir</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimetableGrid;
