/**
 * Created by alejandro on 11/03/17.
 */
const random = array => { return array[Math.floor(Math.random() * array.length)] }
const getAskForModel = () => {
    const answers = [
        'Here is al the info you need about the product',
        'Here you are! The info you requested',
        'Here you are!'
    ];
    return random(answers)
}

module.exports = getAskForModel;