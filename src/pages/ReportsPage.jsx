import React, { useState } from 'react';
import { Download, CalendarDays, Banknote, Package, AlertTriangle, FileBarChart2, ShieldCheck, Stethoscope } from 'lucide-react';
import { PageHeading, StatCard, EmptyState, LoadingLine, InlineError, ReceiptIcon, useApiData } from '../components/Common';
import { TransactionTable } from './TransactionsPage';
import { dateLabel, money, titleCase, todayString } from '../api';

export function ReportsPage({ refreshKey }) {
  const [period, setPeriod] = useState('daily');
  const [date, setDate] = useState(todayString());
  const [refresh, setRefresh] = useState(0);

  const query = `/api/reports?period=${period}&date=${date}`;
  const { data, loading, error } = useApiData(query, `${refreshKey}-${refresh}`);

  const exportCsv = () => {
    if (!data?.transactions?.length) return;
    const rows = [
      ['Transaction ID', 'Customer', 'Service', 'Date', 'Time', 'Method', 'Discount Type', 'Discount Amount', 'Amount Paid', 'Reference'],
      ...data.transactions.map((t) => [
        `TXN-${t.id}`,
        t.customer_name,
        t.service_name,
        t.appointment_date,
        t.start_time,
        t.method,
        t.discount_type || 'None',
        Number(t.discount_amount || 0).toFixed(2),
        Number(t.amount).toFixed(2),
        t.reference || ''
      ])
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `wj-wellness-sales-${period}-${date}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeading
        title="Sales & operations reports"
        description="Generate a clear summary of recorded payments and therapist commissions for your selected reporting period."
      />
      <section className="panel report-filter-panel">
        <div>
          <span className="section-kicker">REPORT BUILDER</span>
          <h3>Choose a reporting period</h3>
          <p>Reports are based on payments saved in the transaction records.</p>
        </div>
        <div className="report-controls">
          <div className="filter-tabs">
            {['daily', 'weekly', 'monthly'].map((p) => (
              <button
                key={p}
                className={period === p ? 'selected' : ''}
                onClick={() => { setPeriod(p); setRefresh((v) => v + 1); }}
              >
                {titleCase(p)}
              </button>
            ))}
          </div>
          <input
            type="date"
            value={date}
            onChange={(e) => { setDate(e.target.value); setRefresh((v) => v + 1); }}
          />
          <button className="secondary-button" onClick={exportCsv} disabled={!data?.transactions?.length}>
            <Download size={15} /> Export CSV
          </button>
          <a className="secondary-button" href="/api/backup" download title="Download database backup file">
            <Download size={15} /> Backup Database
          </a>
        </div>
      </section>

      {error && <InlineError message={error} />}

      <div className="report-period-line">
        <span><CalendarDays size={15} /> {data ? `${dateLabel(data.from)} — ${dateLabel(data.to)}` : 'Selected period'}</span>
        <span className="report-live"><i /> UPDATED FROM DATABASE</span>
      </div>

      <div className="stats-grid report-stats">
        <StatCard label="Total sales" value={loading ? '—' : money(data?.summary?.total_sales)} detail={`${titleCase(period)} recorded revenue`} icon={Banknote} tone="green" />
        <StatCard label="Transactions" value={loading ? '—' : data?.summary?.transaction_count ?? 0} detail="Payments in this period" icon={ReceiptIcon} tone="blue" />
        <StatCard label="Inventory items" value={loading ? '—' : data?.inventorySummary?.item_count ?? 0} detail="Active items tracked" icon={Package} tone="gold" />
        <StatCard label="Low-stock items" value={loading ? '—' : data?.inventorySummary?.low_stock_count ?? 0} detail="Needs replenishment" icon={AlertTriangle} tone="rose" />
      </div>

      <section className="panel report-table-panel">
        <div className="panel-heading">
          <div>
            <span className="section-kicker">SOURCE TRANSACTIONS</span>
            <h3>Sales detail</h3>
            <p>Individual payment entries included in this report</p>
          </div>
        </div>
        {loading ? (
          <LoadingLine />
        ) : data?.transactions?.length ? (
          <TransactionTable transactions={data.transactions} />
        ) : (
          <EmptyState icon={FileBarChart2} title="No recorded sales for this period" description="Try another date or period. Only saved payment entries are included." />
        )}
      </section>

      <section className="panel report-table-panel" style={{ marginTop: '24px' }}>
        <div className="panel-heading">
          <div>
            <span className="section-kicker">STAFF COMMISSIONS & WORKLOAD</span>
            <h3>Therapist performance & commissions</h3>
            <p>Completed appointments and revenue rendered in this reporting period</p>
          </div>
        </div>
        {loading ? (
          <LoadingLine />
        ) : data?.therapistStats?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>THERAPIST</th>
                  <th>SERVICES COMPLETED</th>
                  <th>TOTAL SERVICE REVENUE</th>
                  <th>THERAPIST SHARE (30% SAHOD)</th>
                  <th>SPA SHARE (70%)</th>
                </tr>
              </thead>
              <tbody>
                {data.therapistStats.map((t) => {
                  const rev = Number(t.total_revenue || 0);
                  const therapistComm = rev * 0.3;
                  const spaShare = rev * 0.7;
                  return (
                    <tr key={t.id}>
                      <td><strong className="cell-primary">{t.name}</strong></td>
                      <td><span className="visit-count">{t.services_completed}</span></td>
                      <td><strong className="cell-primary">{money(rev)}</strong></td>
                      <td>
                        <span className="therapist-commission-badge" style={{ background: '#e8f5e9', color: '#1b5e20', border: '1px solid #c8e6c9', fontWeight: 800 }}>
                          {money(therapistComm)} (30%)
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#881c2d', fontWeight: 700 }}>
                          {money(spaShare)} (70%)
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={Stethoscope} title="No therapist performance recorded" description="Completed paid appointments will populate the therapist summary." />
        )}
      </section>

      <div className="report-method-note">
        <ShieldCheck size={16} /> Report totals reflect payment records entered by authorized staff; commissions are calculated from completed paid services.
      </div>
    </>
  );
}
