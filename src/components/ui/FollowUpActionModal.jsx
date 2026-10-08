import React, { useEffect, useMemo, useState } from "react";
import {
  createMeeting,
  createTask,
  MEETING_REMINDER_OPTIONS,
  MEETING_VENUE_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_REMINDER_LEAD_MINUTES,
} from "../../api/zohoCrm";
import { useZohoCrm } from "../../context/ZohoCrmContext";

const ACTION_OPTIONS = ["Call", "Task", "Meeting"];
const MEETING_DURATION_MS = 60 * 60 * 1000;

const pad2 = (value) => String(value).padStart(2, "0");

const parseDateTime = (value) => {
  const date = new Date(String(value || "").trim());
  return Number.isNaN(date.getTime()) ? null : date;
};

const toInputValue = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const formatDateTimeLabel = (date) =>
  date
    ? date.toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const ReadOnlyField = ({ label, value, hint }) => (
  <div className="space-y-2.5">
    <p className="text-sm font-medium text-foreground">{label}</p>
    <p className="ui-input flex min-h-12 items-center px-3.5 py-2.5 text-sm text-muted-foreground">
      {value || "—"}
    </p>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);

const EMPTY_TASK = {
  subject: "",
  priority: "Normal",
  reminder: true,
  description: "",
};

const EMPTY_MEETING = {
  title: "",
  venue: MEETING_VENUE_OPTIONS[0],
  location: "",
  from: "",
  to: "",
  timesEdited: false,
  reminder: MEETING_REMINDER_OPTIONS[0].label,
};

const FollowUpActionModal = ({
  open = false,
  action = "",
  followUpDate = "",
  onConfirm = () => {},
  onCancel = () => {},
}) => {
  const [draftAction, setDraftAction] = useState(action);
  const [draftDate, setDraftDate] = useState(followUpDate);
  const [task, setTask] = useState(EMPTY_TASK);
  const [meeting, setMeeting] = useState(EMPTY_MEETING);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { leadRecord, currentUser } = useZohoCrm();

  const leadName = leadRecord?.Last_Name || "Lead";
  const ownerName =
    currentUser?.full_name || currentUser?.name || currentUser?.email || "—";

  useEffect(() => {
    if (!open) return;
    setDraftAction(action);
    setDraftDate(followUpDate);
    setTask({ ...EMPTY_TASK, subject: `Follow-up - ${leadName}` });
    setMeeting({ ...EMPTY_MEETING, title: `Follow-up - ${leadName}` });
    setError("");
    setIsSaving(false);
  }, [open, action, followUpDate, leadName]);

  const followUpAt = useMemo(() => parseDateTime(draftDate), [draftDate]);

  // Meeting times track the follow-up slot until the user edits them by hand.
  useEffect(() => {
    if (!open) return;
    setMeeting((prev) => {
      if (prev.timesEdited) return prev;
      const start = parseDateTime(draftDate);
      if (!start) return { ...prev, from: "", to: "" };
      return {
        ...prev,
        from: toInputValue(start),
        to: toInputValue(new Date(start.getTime() + MEETING_DURATION_MS)),
      };
    });
  }, [open, draftDate]);

  const taskRemindAt = useMemo(
    () =>
      followUpAt
        ? new Date(
            followUpAt.getTime() - TASK_REMINDER_LEAD_MINUTES * 60 * 1000,
          )
        : null,
    [followUpAt],
  );

  if (!open) return null;

  const updateTask = (patch) => {
    setTask((prev) => ({ ...prev, ...patch }));
    if (error) setError("");
  };

  const updateMeeting = (patch) => {
    setMeeting((prev) => ({ ...prev, ...patch }));
    if (error) setError("");
  };

  // Moving the start keeps whatever duration is already on screen.
  const handleMeetingFromChange = (value) => {
    const nextStart = parseDateTime(value);
    const prevStart = parseDateTime(meeting.from);
    const prevEnd = parseDateTime(meeting.to);
    const duration =
      prevStart && prevEnd && prevEnd > prevStart
        ? prevEnd.getTime() - prevStart.getTime()
        : MEETING_DURATION_MS;

    updateMeeting({
      from: value,
      to: nextStart
        ? toInputValue(new Date(nextStart.getTime() + duration))
        : meeting.to,
      timesEdited: true,
    });
  };

  const handleVenueChange = (venue) => {
    // In-office meetings have no address to capture, so drop any stale value.
    updateMeeting({ venue, location: "" });
  };

  const handleConfirm = async () => {
    const selectedAction = draftAction.trim();
    const followUpValue = draftDate.trim();

    if (!selectedAction || !followUpValue) {
      setError("Action and follow-up date and time are required.");
      return;
    }

    if (!ACTION_OPTIONS.includes(selectedAction)) {
      setError("Invalid action.");
      return;
    }

    if (!followUpAt) {
      setError("Enter a valid follow-up date and time.");
      return;
    }

    const recordId = leadRecord?.id;
    if (!recordId) {
      setError("Lead ID is not available.");
      return;
    }

    if (selectedAction === "Task" && !task.subject.trim()) {
      setError("Subject is required for a task.");
      return;
    }

    if (selectedAction === "Meeting") {
      if (!meeting.title.trim()) {
        setError("Title is required for a meeting.");
        return;
      }
      if (meeting.venue === "Client Location" && !meeting.location.trim()) {
        setError("Location is required for a client location meeting.");
        return;
      }
      if (meeting.venue === "Online" && !meeting.location.trim()) {
        setError("Meeting link is required for an online meeting.");
        return;
      }

      const startsAt = parseDateTime(meeting.from);
      const endsAt = parseDateTime(meeting.to);
      if (!startsAt || !endsAt) {
        setError("Enter a valid meeting From and To date and time.");
        return;
      }
      if (endsAt <= startsAt) {
        setError("Meeting To time must be after the From time.");
        return;
      }
    }

    setIsSaving(true);
    setError("");

    try {
      if (selectedAction === "Meeting") {
        const reminder = MEETING_REMINDER_OPTIONS.find(
          (option) => option.label === meeting.reminder,
        );
        await createMeeting({
          title: meeting.title,
          startDateTime: meeting.from,
          endDateTime: meeting.to,
          hostId: currentUser?.id,
          venue: meeting.venue,
          location: meeting.venue === "In-office" ? "" : meeting.location,
          reminderMinutes: reminder?.minutes,
          leadId: recordId,
        });
      } else if (selectedAction === "Task") {
        await createTask({
          subject: task.subject,
          dueDate: followUpValue,
          ownerId: currentUser?.id,
          priority: task.priority,
          reminder: task.reminder,
          description: task.description,
          leadId: recordId,
        });
      } else {
        await createTask({
          subject: `${selectedAction} follow-up - ${leadName}`,
          dueDate: followUpValue,
          ownerId: currentUser?.id,
          reminder: true,
          leadId: recordId,
        });
      }
    } catch (err) {
      console.log(JSON.stringify(err));
      setError(err?.data?.[0]?.message || "Failed to create follow-up. Please try again.");
      setIsSaving(false);
      return;
    }

    setIsSaving(false);
    onConfirm({
      action: selectedAction,
      followUpDate: followUpValue,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close follow-up modal"
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
        disabled={isSaving}
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl md:p-6">
        <h3 className="text-lg font-semibold text-card-foreground">
          Follow Up Action
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Add the action and follow-up date and time. Closing without both will
          remove Follow Up Action from the status.
        </p>

        <div className="mt-5 space-y-2.5">
          <label
            htmlFor="follow-up-action"
            className="text-sm font-medium text-foreground"
          >
            Action <span className="text-destructive">*</span>
          </label>
          <select
            id="follow-up-action"
            value={draftAction}
            onChange={(event) => {
              setDraftAction(event.target.value);
              if (error) setError("");
            }}
            className="ui-input h-12 text-sm"
          >
            <option value="" disabled>
              Select action
            </option>
            {ACTION_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 space-y-2.5">
          <label
            htmlFor="follow-up-date"
            className="text-sm font-medium text-foreground"
          >
            Follow-up Date & Time <span className="text-destructive">*</span>
          </label>
          <input
            id="follow-up-date"
            type="datetime-local"
            value={draftDate}
            onChange={(event) => {
              setDraftDate(event.target.value);
              if (error) setError("");
            }}
            className="ui-input h-12 text-sm"
          />
        </div>

        {draftAction === "Task" && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Task details
            </p>

            <ReadOnlyField label="Owner" value={ownerName} />

            <div className="space-y-2.5">
              <label
                htmlFor="task-subject"
                className="text-sm font-medium text-foreground"
              >
                Subject <span className="text-destructive">*</span>
              </label>
              <input
                id="task-subject"
                type="text"
                value={task.subject}
                onChange={(event) => updateTask({ subject: event.target.value })}
                placeholder="Task subject"
                className="ui-input h-12 text-sm"
              />
            </div>

            <ReadOnlyField
              label="Due Date"
              value={formatDateTimeLabel(followUpAt)}
              hint="Taken from the follow-up date and time."
            />

            <div className="space-y-2.5">
              <label
                htmlFor="task-priority"
                className="text-sm font-medium text-foreground"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={task.priority}
                onChange={(event) =>
                  updateTask({ priority: event.target.value })
                }
                className="ui-input h-12 text-sm"
              >
                {TASK_PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                Reminder
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={task.reminder}
                aria-label="Reminder"
                onClick={() => updateTask({ reminder: !task.reminder })}
                className={`relative h-6 w-11 shrink-0 rounded-full border border-border transition-colors ${
                  task.reminder ? "bg-primary" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all ${
                    task.reminder ? "left-5.5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {task.reminder && (
              <ReadOnlyField
                label="Reminder Timing"
                value={`${formatDateTimeLabel(taskRemindAt)} (Pop-up + Email)`}
                hint={`${TASK_REMINDER_LEAD_MINUTES} minutes before the follow-up date and time.`}
              />
            )}

            <div className="space-y-2.5">
              <label
                htmlFor="task-description"
                className="text-sm font-medium text-foreground"
              >
                Description{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <textarea
                id="task-description"
                value={task.description}
                onChange={(event) =>
                  updateTask({ description: event.target.value })
                }
                placeholder="Add any context for this task"
                className="ui-input min-h-24 resize-y text-sm"
              />
            </div>
          </div>
        )}

        {draftAction === "Meeting" && (
          <div className="mt-5 space-y-4 border-t border-border pt-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Meeting details
            </p>

            <div className="space-y-2.5">
              <label
                htmlFor="meeting-title"
                className="text-sm font-medium text-foreground"
              >
                Title <span className="text-destructive">*</span>
              </label>
              <input
                id="meeting-title"
                type="text"
                value={meeting.title}
                onChange={(event) =>
                  updateMeeting({ title: event.target.value })
                }
                placeholder="Meeting title"
                className="ui-input h-12 text-sm"
              />
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="meeting-venue"
                className="text-sm font-medium text-foreground"
              >
                Meeting Venue
              </label>
              <select
                id="meeting-venue"
                value={meeting.venue}
                onChange={(event) => handleVenueChange(event.target.value)}
                className="ui-input h-12 text-sm"
              >
                {MEETING_VENUE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {meeting.venue === "Client Location" && (
              <div className="space-y-2.5">
                <label
                  htmlFor="meeting-location"
                  className="text-sm font-medium text-foreground"
                >
                  Location <span className="text-destructive">*</span>
                </label>
                <input
                  id="meeting-location"
                  type="text"
                  value={meeting.location}
                  onChange={(event) =>
                    updateMeeting({ location: event.target.value })
                  }
                  placeholder="Client address"
                  className="ui-input h-12 text-sm"
                />
              </div>
            )}

            {meeting.venue === "Online" && (
              <div className="space-y-2.5">
                <label
                  htmlFor="meeting-link"
                  className="text-sm font-medium text-foreground"
                >
                  Meeting Link <span className="text-destructive">*</span>
                </label>
                <input
                  id="meeting-link"
                  type="text"
                  value={meeting.location}
                  onChange={(event) =>
                    updateMeeting({ location: event.target.value })
                  }
                  placeholder="Online meeting link"
                  className="ui-input h-12 text-sm"
                />
              </div>
            )}

            <div className="space-y-2.5">
              <label
                htmlFor="meeting-from"
                className="text-sm font-medium text-foreground"
              >
                From <span className="text-destructive">*</span>
              </label>
              <input
                id="meeting-from"
                type="datetime-local"
                value={meeting.from}
                onChange={(event) =>
                  handleMeetingFromChange(event.target.value)
                }
                className="ui-input h-12 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Prefilled from the follow-up date and time.
              </p>
            </div>

            <div className="space-y-2.5">
              <label
                htmlFor="meeting-to"
                className="text-sm font-medium text-foreground"
              >
                To <span className="text-destructive">*</span>
              </label>
              <input
                id="meeting-to"
                type="datetime-local"
                value={meeting.to}
                onChange={(event) =>
                  updateMeeting({ to: event.target.value, timesEdited: true })
                }
                className="ui-input h-12 text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Defaults to one hour after the From time.
              </p>
            </div>

            <ReadOnlyField label="Host" value={ownerName} />

            <div className="space-y-2.5">
              <label
                htmlFor="meeting-reminder"
                className="text-sm font-medium text-foreground"
              >
                Reminder
              </label>
              <select
                id="meeting-reminder"
                value={meeting.reminder}
                onChange={(event) =>
                  updateMeeting({ reminder: event.target.value })
                }
                className="ui-input h-12 text-sm"
              >
                {MEETING_REMINDER_OPTIONS.map((option) => (
                  <option key={option.label} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm font-medium text-destructive">{error}</p>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="btn-secondary min-h-11 min-w-28 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSaving}
            className="btn-primary min-h-11 min-w-28 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FollowUpActionModal;
