// Scripted Sol demos (mobile and NO web chats), keyed by Network Operator id: the
// selected account's scripts are the ones the chat offers (one suggestion chip
// each) and plays.
//
// A script starts when the user's first message matches `match` (the suggested
// `prompt` always does). Sol then plays `beats` in order. A beat with `wait`
// pauses the script until the user answers: any text for "text", an uploaded
// photo for "photo". A beat with `complete` closes `taskId` (with the uploaded
// photo attached) as it is sent. `card` shows the compact task card with that
// status snapshot beneath the message.

export interface SolBeat {
  text: string;
  card?: "not_started" | "completed";
  wait?: "text" | "photo";
  complete?: boolean;
}

export interface SolScript {
  prompt: string;
  match: RegExp;
  taskId: string;
  historyTitle: string;
  beats: SolBeat[];
}

export const SOL_SCRIPTS: Record<string, SolScript[]> = {
  "no-onehourmaids": [
    // Dropoff · Ivy Nakashima · 935 W Diversey Pkwy
    {
      prompt: "The delivery on Diversey was completed",
      match: /diversey/i,
      taskId: "task-st-23",
      historyTitle: "Closing the Diversey delivery",
      beats: [
        { text: "Okay, that's the delivery to Ivy at 935 W Diversey?", card: "not_started" },
        {
          text: "I need a photo to close this task. Let me know if this is not the correct task.",
          wait: "photo",
        },
        {
          text: "Thanks. I've attached that image to the task and closed it.",
          card: "completed",
          complete: true,
        },
      ],
    },
  ],

  "no-brickcity": [
    // Receive Pallet · Renata Cole · Jersey City Depot
    {
      prompt: "I received a pallet of coffee for Renata Cole",
      match: /renata|pallet|coffee/i,
      taskId: "task-fb-15",
      historyTitle: "Receiving Renata's coffee pallet",
      beats: [
        { text: "Okay, I found this receiving task.", card: "not_started" },
        // The user answers "8" — the task's own quantity (inv-fb-2 × 8).
        { text: "How many cases of cold brew are on the pallet?", wait: "text" },
        { text: "This task called for 8 cases. Quantity matched." },
        { text: "Send me a photo of the pallet and I'll mark it received.", wait: "photo" },
        { text: "Pallet has been received.", card: "completed", complete: true },
      ],
    },
    // Label · Brightline Media · Jersey City Depot
    {
      prompt: "I labeled the cans for Brightline",
      match: /label|brightline|cans/i,
      taskId: "task-fb-16",
      historyTitle: "Labeling Brightline's cans",
      beats: [
        { text: "How many cans were labeled?", card: "not_started", wait: "text" },
        // The user answers "10 cases of 12".
        { text: "Recorded 120 cans to the task. Send me a photo, please.", wait: "photo" },
        { text: "Okay, task is complete.", card: "completed", complete: true },
      ],
    },
  ],
};
