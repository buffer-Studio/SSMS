import { Clock, User } from 'lucide-react';

const ChangeLogPanel = ({ changelogs }) => {
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  return (
    <div className="glass p-6 rounded-2xl h-fit sticky top-6 shadow-lg">
      <div className="flex items-center gap-2 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg shadow-md">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Changes</h2>
      </div>

      {changelogs.length === 0 ? (
        <div className="text-center py-8">
          <div className="inline-block p-4 bg-gray-100 dark:bg-slate-800 rounded-full mb-3">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No recent changes</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            Changes from the last 24 hours will appear here
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Showing {changelogs.length} change{changelogs.length !== 1 ? 's' : ''} from the last 24 hours
            </p>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {changelogs.map((log, index) => (
              <div
                key={log.id || index}
                className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 space-y-2 hover:shadow-md transition-all"
                data-testid={`changelog-${index}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">
                      {log.day}, Period {log.period}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimestamp(log.timestamp)}
                    </p>
                  </div>
                  <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-2 py-1 rounded-md text-xs text-white font-medium shadow-sm">
                    Updated
                  </div>
                </div>

                <div className="space-y-1 bg-gray-50 dark:bg-slate-900 p-3 rounded-lg">
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Previous: </span>
                    <span className="text-gray-700 dark:text-gray-300 line-through">{log.old_value}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Current: </span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">{log.new_value}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-slate-700">
                  <User className="w-3 h-3" />
                  <span>Changed by <span className="font-medium text-gray-700 dark:text-gray-300">{log.changed_by}</span></span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ChangeLogPanel;
