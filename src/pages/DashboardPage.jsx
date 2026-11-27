import React from 'react';
import { CalendarDays, Clock3, Banknote, Package, UserRound, ArrowRight, Sparkles, CalendarCheck } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeading, StatCard, StatusPill, EmptyState, LoadingLine, InlineError, useApiData } from '../components/Common';
import { money } from '../api';

export function DashboardPage({ user, refreshKey, setPage }) {
  const { data, loading, error } = useApiData('/api/dashboard', refreshKey);
  const stats = data?.stats || {};
  const isTherapist = user.role === 'therapist';

  return (
    <>
      <PageHeading
        kicker="YOUR BRANCH AT A GLANCE"
        title="A smoother day starts here."
        description="A clear view of appointments, sales, and daily operations."
        action={() => setPage('appointments')}
        actionLabel="View appointments"
        actionIcon={CalendarCheck}
      />
      {error && <InlineError message={error} />}
      <div className="stats-grid">
        <StatCard label="Today's appointments" value={loading ? '—' : stats.todayAppointments ?? 0} detail="Scheduled for today" icon={CalendarDays} tone="green" />
        <StatCard label="Pending requests" value={loading ? '—' : stats.pendingAppointments ?? 0} detail="Awaiting staff review" icon={Clock3} tone="gold" />
        {!isTherapist && <StatCard label="Sales today" value={loading ? '—' : money(stats.salesToday)} detail="Recorded payments" icon={Banknote} tone="blue" />}
        {!isTherapist && <StatCard label="Low-stock items" value={loading ? '—' : stats.lowStock ?? 0} detail="At or below minimum stock" icon={Package} tone="rose" />}
        {isTherapist && <StatCard label="My schedule" value={loading ? '—' : stats.todayAppointments ?? 0} detail="Appointments assigned today" icon={UserRound} tone="blue" />}
      </div>
      <div className="dashboard-grid">
        {!isTherapist && (
          <section className="panel sales-panel">
            <div className="panel-heading">
              <div>
                <span className="section-kicker">PAYMENT ACTIVITY</span>
                <h3>Sales overview</h3>
                <p>Recorded payments over the last 7 days</p>
              </div>
              <div className="chart-legend"><i /> SALES</div>
            </div>
            <div className="chart-wrap">
              {loading ? (
                <LoadingLine />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.salesTrend || []} margin={{ top: 12, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#9abca8" stopOpacity={0.38} />
                        <stop offset="95%" stopColor="#9abca8" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#e9eee9" strokeDasharray="3 5" vertical={false} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#8c9890', fontSize: 11 }} dy={9} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8c9890', fontSize: 10 }} tickFormatter={(v) => (v === 0 ? '₱0' : `₱${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`)} />
                    <Tooltip formatter={(value) => [money(value), 'Sales']} labelStyle={{ color: '#27463b', fontWeight: 700 }} contentStyle={{ border: '1px solid #e4ebe5', borderRadius: 12, boxShadow: '0 8px 24px #1e3d2d12' }} />
                    <Area type="monotone" dataKey="sales" stroke="#4f8069" strokeWidth={2.5} fill="url(#salesFill)" activeDot={{ r: 5, fill: '#315c48', stroke: '#fff', strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>
        )}
        <section className={`panel upcoming-panel ${isTherapist ? 'full-panel' : ''}`}>
          <div className="panel-heading">
            <div>
              <span className="section-kicker">ON THE CALENDAR</span>
              <h3>{isTherapist ? 'My upcoming schedule' : 'Upcoming appointments'}</h3>
              <p>Next reservations and their current status</p>
            </div>
            <button className="text-button" onClick={() => setPage('appointments')}>View all <ArrowRight size={14} /></button>
          </div>
          {loading ? (
            <LoadingLine />
          ) : data?.nextAppointments?.length ? (
            <div className="upcoming-list">
              {data.nextAppointments.map((item) => (
                <div className="upcoming-item" key={item.id}>
                  <div className="appointment-date-tile">
                    <strong>{String(item.appointment_date).slice(8, 10)}</strong>
                    <span>{new Date(`${item.appointment_date}T00:00:00`).toLocaleDateString('en-PH', { month: 'short' })}</span>
                  </div>
                  <div className="upcoming-info">
                    <strong>{item.customer_name}</strong>
                    <span>{item.service_name} · {item.start_time}</span>
                    <small>{item.therapist_name || 'Therapist to be assigned'}</small>
                  </div>
                  <StatusPill status={item.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={CalendarDays} title="No upcoming appointments" description="New appointment requests will appear here." />
          )}
        </section>
      </div>
      <div className="dashboard-bottom-note">
        <div className="note-icon"><Sparkles size={17} /></div>
        <div>
          <strong>Keep every detail in one place.</strong>
          <span>Review pending requests, keep therapist schedules updated, and record each transaction as it happens.</span>
        </div>
        <button className="text-button" onClick={() => setPage('appointments')}>Manage today <ArrowRight size={14} /></button>
      </div>
    </>
  );
}
