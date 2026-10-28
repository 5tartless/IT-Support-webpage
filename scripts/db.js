// db.js

import path from "node:path";
import dbLocal from "db-local";

const { Schema } = new dbLocal({ path: path.join(import.meta.dirname, '..', 'db') })

export const Ticket = Schema('Ticket', {
    _id:         { type: String, required: true },
    customer:    { type: String, required: true },
    email:       { type: String, required: true },
    device:      { type: String, required: true },
    os:          { type: String, required: true },
    category:    { type: String, required: true },
    description: { type: String, required: true },
    priority:    { type: String, default: 'medium' },
    state:       { type: String, default: 'opened' },
    createdAt:   { type: String, required: true }
});

export const Message = Schema('Message', {
  _id:       { type: String, required: true },
  ticketId:  { type: String, required: true },
  text:      { type: String, required: true },
  createdAt: { type: String, required: true }
});