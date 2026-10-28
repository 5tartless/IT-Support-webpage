import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import { problems } from './scripts/problems.js';
import { services } from './scripts/services.js';
import { Ticket, Message } from './scripts/db.js';
import { STATES, PRIORITIES } from './scripts/ticketOptions.js';
import { sendTicketEmail } from './scripts/mailer.js';

const app = express();
//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(import.meta.dirname, 'public', 'views'));
app.use(express.static(path.join(import.meta.dirname, 'public')));


function getTicket(req,res) {
    const ticket = Ticket.findOne({ _id: req.params.id })
    if (!ticket) res.status(404).send('Ticket not found')
    return ticket
}

//get
app.get("/", (req, res) => {
    res.redirect('/home');
})
app.get("/home", (req, res) => {
    res.render('home', {problems});
})
app.get("/about", (req, res) => {
    res.render('about')
})
app.get("/services", (req, res) => {
    res.render('services', {services})
})

app.get("/tickets", (req, res) => {
    const tickets = Ticket.find().reverse()
    const openedTickets = tickets.filter(t => t.state !== STATES[2])
    const closedTickets = tickets.filter(t => t.state === STATES[2])

    res.render('admin-ticket', {tickets, openedTickets, closedTickets, STATES})
})
app.get("/ticket/new", (req, res) => {
    res.render('create-ticket', {problems})
})
app.get("/ticket/:id", (req, res) => {
    const ticket = getTicket(req, res)
    if (!ticket) return;

    const messages = Message.find({ ticketId: ticket._id })
    res.render("attend-ticket.ejs", {ticket, messages, PRIORITIES})
})



//post

app.post("/ticket/create", (req, res) => {
    const { customer, email, device, os, category, description } = req.body

    //browser could be wrong :c we validate again
    const fields = [customer, email, device, os, category, description]
    if (fields.some(f => typeof f !== 'string' || f.trim() === '')) {
        return res.status(400).json({ error: 'All fields are required' })
    }
    if (!problems.some(p => p.title === category)) {
        return res.status(400).json({ error: 'Invalid category' })
    }

    const id = crypto.randomUUID()
    Ticket.create({
        _id: id,
        customer, email, device, os, category, description,
        createdAt: new Date().toISOString()
    }).save()

    res.status(201).json({ created: true })
});

app.post("/ticket/:id/attend", async (req, res) => {
    const ticket = getTicket(req, res)
    if (!ticket) return
    if (ticket.state === STATES[0]) {
        Ticket.update({ _id: ticket._id }, { state: STATES[1] }).save()
    }

    try {
        await sendTicketEmail(
            ticket,
            "Your ticket is now in progress. This means we are trying to get you a solution as quick as possible.",
            false
        )
    } catch (err) {
        console.error('Email failed:', err.message)
    }

    res.redirect(`/ticket/${ticket._id}`)
})

app.post("/ticket/:id/priority", (req, res) => {
    const ticket = getTicket(req, res)
    if (!ticket) return

    const { priority } = req.body
    if (!PRIORITIES.includes(priority)) return res.state(400).send('Invalid priority')

    Ticket.update({ _id: ticket._id }, { priority }).save()
    res.redirect(`/ticket/${ticket._id}`)
})

app.post("/ticket/:id/respond", async (req, res) => {
    const ticket = getTicket(req, res)
    if (!ticket) return
    if (ticket.state !== STATES[1]) return res.status(400).send("Ticket is not in progress")

    const { action, text } = req.body
    const message = (text|| '').trim()
    const closing = action === 'close'

    if (!message && !closing) return res.status(400).send("Write a message to continue.")
    if (message) {
        Message.create({
            _id: crypto.randomUUID(),
            ticketId: ticket._id,
            text: message,
            createdAt: new Date().toISOString()
        }).save()
    }
    if (closing) {
        Ticket.update({ _id: ticket._id }, { state: STATES[2] }).save()
    }

    try {
        await sendTicketEmail(
            ticket,
            message || 'Your ticket has been resolved and closed.',
            closing
        )
    } catch (err) {
        console.error('Email failed:', err.message)
    }

    res.redirect(closing? '/tickets/':`/ticket/${ticket._id}`)
})

app.listen(3000, () => console.log('http://localhost:3000'));