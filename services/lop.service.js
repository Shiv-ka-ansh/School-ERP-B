exports.calculateLop = ({ basic = 0, workingDays = 26, absentDays = 0, approvedLeaveDays = 0 }) => {
  const safeWorkingDays = workingDays > 0 ? workingDays : 26;
  const dailyRate = basic / safeWorkingDays;
  const lopDays = Math.max(0, absentDays - approvedLeaveDays);
  const lopDeduction = Number((dailyRate * lopDays).toFixed(2));
  return { dailyRate, lopDays, lopDeduction };
};
