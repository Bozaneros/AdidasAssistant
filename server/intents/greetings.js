const random = array => { return array[Math.floor(Math.random() * array.length)] }
const getGreetings = () => {
    const answers = [
        'Hello!',
        'Hello! How are you? What do you need?',
        'Hey, nice to see you.',
        'Welcome back!',
        'Hi, I\'m the Adidas Assistant. How can I help you?',
        'Hey, what do you need?',
    ];
    return random(answers)
}

module.exports = getGreetings;