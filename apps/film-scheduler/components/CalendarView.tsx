import { useState } from 'react';

interface Session {
  date: string;
  time: string;
  location: string;
  filmTitle: string;
}

interface CalendarViewProps {
  selectedSessions: Session[];
}

export default function CalendarView({ selectedSessions }: CalendarViewProps) {
  const [view, setView] = useState<'week' | 'month'>('week'); // Can toggle between week and month view

  const renderWeekView = () => {
    return selectedSessions.map((session, index) => (
      <div key={index} className="mb-4 p-4 bg-white shadow rounded">
        <h4 className="text-lg font-semibold">
          {session.date} - {session.time}
        </h4>
        <p className="text-gray-600">{session.location}</p>
      </div>
    ));
  };

  return (
    <div className="w-3/4 p-4">
      <div className="mb-4 flex justify-between">
        <h2 className="text-lg font-bold">{view === 'week' ? 'Week' : 'Month'} View</h2>
        <button
          onClick={() => setView(view === 'week' ? 'month' : 'week')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Toggle View
        </button>
      </div>
      <div>{renderWeekView()}</div>
    </div>
  );
}
