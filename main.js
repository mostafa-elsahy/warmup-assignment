const fs = require("fs");

//Helper Methods: 
//toSeconds(timeStr)
    function toSeconds(timeStr) {
        const [time, modifier] = timeStr.trim().split(' ');
        let [hours, minutes, seconds] = time.split(':').map(Number);

        if (modifier.toLowerCase() === 'pm' && hours !== 12) hours += 12;
        if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;

        return hours * 3600 + minutes * 60 + seconds;
    }
//formatSecondsToTime(seconds)
function formatSecondsToTime(totalSeconds) {
    let h = Math.floor(totalSeconds / 3600);
    totalSeconds -= h * 3600;

    let m = Math.floor(totalSeconds / 60);
    totalSeconds -= m * 60;

    let s = totalSeconds;

    if (m === 0) {
        m = "00";
    }
    if (s === 0) {
        s = "00";
    }

    return `${h}:${m}:${s}`;
}
//hmsToSeconds(hms)
function hmsToSeconds(hms) {
    const [hours, minutes, seconds] = hms.split(":").map(Number);
    return hours * 3600 + minutes * 60 + seconds;
}
// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    // TODO: Implement this function
    let startSeconds = toSeconds(startTime);
    let endSeconds = toSeconds(endTime);

    // Handle overnight shifts
    if (endSeconds <= startSeconds) {
        endSeconds += 24 * 3600;
    }

    const diff = endSeconds - startSeconds;

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    // TODO: Implement this function
    const startSeconds = toSeconds(startTime);
    const endSeconds = toSeconds(endTime);

    const workStart = toSeconds("8:00:00 am");
    const workEnd = toSeconds("10:00:00 pm");

    let idleSeconds = 0;

    //Idle before 8 AM
    if (startSeconds < workStart) {
        const beforeWork = Math.min(endSeconds, workStart) - startSeconds;
        idleSeconds += Math.max(beforeWork, 0);
    }

    //Idle after 10 PM
    if (endSeconds > workEnd) {
        const afterWork = endSeconds - Math.max(startSeconds, workEnd);
        idleSeconds += Math.max(afterWork, 0);
    }

    return formatSecondsToTime(idleSeconds);
} 

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    // TODO: Implement this function
    const shiftSeconds = hmsToSeconds(shiftDuration);
    const idleSeconds = hmsToSeconds(idleTime);
    const activeSeconds = shiftSeconds - idleSeconds;
    return formatSecondsToTime(activeSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    // TODO: Implement this function
    const [year, month, day] = date.split("-").map(Number);
    let quota;

    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        quota = "6:00:00";
    } else {
        quota = "8:24:00";
    }

    return hmsToSeconds(activeTime) >= hmsToSeconds(quota);
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    // TODO: Implement this function
    const content = fs.readFileSync(textFile, "utf-8").trim();
    const lines = content.split("\n");
    const header = lines[0];
    
    let records = [];
    
    for (let i = 1; i < lines.length; i++) {
        records.push(lines[i].split(","));
    }
    
    const id = shiftObj.driverID;
    const date = shiftObj.date;
    
    // Check duplicate
    for (let r of records) {
        if (r[0] === id && r[2] === date) {
            return {};
        }
    }
    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const quotaMet = metQuota(shiftObj.date, activeTime);

    const newRecord = [
        shiftObj.driverID,
        shiftObj.driverName,
        shiftObj.date,
        shiftObj.startTime,
        shiftObj.endTime,
        shiftDuration,
        idleTime,
        activeTime,
        quotaMet,
        false
    ];

    let pos = -1;

    for (let i = 0; i < records.length; i++) {
        if (records[i][0] === id) pos = i;
    }

    if (pos !== -1) {
        records.splice(pos + 1, 0, newRecord);
    } else {
        records.push(newRecord);
    }

    const newFileContent = [header, ...records.map(r => r.join(","))].join("\n");
    fs.writeFileSync(textFile, newFileContent, "utf-8");

    return {
        driverID: newRecord[0],
        driverName: newRecord[1],
        date: newRecord[2],
        startTime: newRecord[3],
        endTime: newRecord[4],
        shiftDuration: newRecord[5],
        idleTime: newRecord[6],
        activeTime: newRecord[7],
        metQuota: newRecord[8],
        hasBonus: newRecord[9]
    };

}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    // TODO: Implement this function
    const content = fs.readFileSync(textFile, "utf-8").trim();
    if (!content) return; //empty file, nothing to do
    const lines = content.split("\n");
    const header = lines[0];
    let records = [];
    for (let i = 1; i < lines.length; i++) {
        records.push(lines[i].split(","));
    }

    for (let i = 0; i < records.length; i++) {
        if (records[i][0] === driverID && records[i][2] === date) {
            records[i][9] = newValue;
            break;
        }
    }
    const newFileContent = [header, ...records.map(r => r.join(","))].join("\n");
    fs.writeFileSync(textFile, newFileContent, "utf-8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
    const content = fs.readFileSync(textFile, "utf-8").trim();
    if (!content) return -1;
    const lines = content.split("\n");
    const header = lines[0];
    let records = [];
    for (let i = 1; i < lines.length; i++) {
        records.push(lines[i].split(","));
    }

    const targetMonth = parseInt(month, 10);
    let found = false;
    let c = 0;
    for (const r of records) {
        const [id, , dateStr, , , , , , , hasBonus] = r;

        if (id === driverID) {
            found = true;

            const monthOfRecord = parseInt(dateStr.split("-")[1], 10);
            if (monthOfRecord === targetMonth && (hasBonus === "true" || hasBonus === true)) {
                c++;
            }
        }
    }
    return found ? c : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    // TODO: Implement this function
    const content = fs.readFileSync(textFile, "utf-8").trim();
    if (!content) return -1;
    const lines = content.split("\n");
    const header = lines[0];
    let records = [];
    for (let i = 1; i < lines.length; i++) {
        records.push(lines[i].split(","));
    }

    let totalSeconds = 0;
    let found = false;
    for (const r of records) {
        const [id, , dateStr, , , , , activeTime] = r;

        if (id === driverID) {
            found = true;

            const monthOfRecord = parseInt(dateStr.split("-")[1], 10);
            if (monthOfRecord === month) {
                totalSeconds += hmsToSeconds(activeTime);
            }
        }
    }
    if (!found) 
        return "0:00:00";
    return formatSecondsToTime(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    // TODO: Implement this function
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const rateLines = fs.readFileSync(rateFile, "utf-8").trim().split("\n");
    let offday = null;
    for (let line of rateLines) {
        const [id, dayOff] = line.split(",");
        if (id.trim() === driverID.trim()) {
            offday = dayOff.trim();
            break;
        }
    }
    if (!offday) return "0:00:00"; // driver not found

    const shiftLines = fs.readFileSync(textFile, "utf-8").trim().split("\n").slice(1);
    let totalSeconds = 0;
    for (let line of shiftLines) {
        const cols = line.split(",");
        const id = cols[0].trim();
        const dateStr = cols[2].trim();

        if (id !== driverID.trim()) continue; //skip other drivers

        const [y, m, d] = dateStr.split("-").map(Number);
        if (m !== month) continue;
        const dat = new Date(dateStr);
        const dayName = days[dat.getDay()];
        if (dayName === offday) continue; //skip off day

        if (y === 2025 && m === 4 && d >= 10 && d <= 30) {
            totalSeconds += 6 * 3600; //Eid
        } else {
            totalSeconds += 8 * 3600 + 24 * 60; //normal 8:24:00
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;
    if (totalSeconds < 0) totalSeconds = 0;

    return returnToFormat(totalSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    // TODO: Implement this function
    const content = fs.readFileSync(rateFile, "utf-8").trim();
    if (!content) return -1;
    const lines = content.split("\n");
    let records = [];
    for (let i = 0; i < lines.length; i++) {
        records.push(lines[i].split(","));
    }

    //Find driver
    let driverRecord = null;
    for (let i = 0; i < records.length; i++) {
        if (records[i][0].trim() === driverID.trim()) {
            driverRecord = records[i];
            break;
        }
    }
    if (!driverRecord) return -1;

    const basePay = parseInt(driverRecord[2], 10);
    const tier = parseInt(driverRecord[3], 10);

    // Allowed missing hours per tier
    const allowedMissing = {
        1: 50,
        2: 20,
        3: 10,
        4: 3
    };

    const actualSec = hmsToSeconds(actualHours);
    const requiredSec = hmsToSeconds(requiredHours);

    if (actualSec >= requiredSec) {
        return basePay;
    }

    //Calculate missing seconds and apply allowed missing hours
    let missingSec = requiredSec - actualSec;
    missingSec -= allowedMissing[tier] * 3600;
    if (missingSec <= 0) {
        return basePay; // within allowed missing hours
    }

    //Caclulate Deduction
    const missingHours = Math.floor(missingSec / 3600);
    const deductionRate = Math.floor(basePay / 185);
    const salaryDeduction = missingHours * deductionRate;

    const netPay = basePay - salaryDeduction;
    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
