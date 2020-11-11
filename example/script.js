

// store.set('person', { name:'Thomas' })
// console.log( store.get('person').name == 'Thomas' )


class FriendRank {

	people = store.get('people') || {}
	questions = store.get('questions') || {}
	answers = store.get('answers') || []

	/*
		STRUCTURE:

		people = {
			'personID': {
				name: String,
				timeAdded: Number,
				// hidden: Boolean,
			}
		}
		question = {
			'questionID': {
				question: String,
				ranking: Number,
				timeAdded: Number,
				// hidden: Boolean,
			}
		}
		answers = [
			{
				questionID: String,
				sortedPersonIDs: [String],
				timeAdded: Number,
			}
		]
	*/
	
	uuidv4() {
		return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
			(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
		)
	}
	
	saveData(){
		store.set('people', this.people)
		store.set('questions', this.questions)
		store.set('answers', this.answers)
	}

	addPerson(personObj){
		return new Promise((resolve)=>{
			const newPersonID = this.uuidv4()
			this.people[newPersonID] = personObj
			this.saveData()
			resolve()
		})
	}
	updatePerson(personID, newPersonObj){
		return new Promise((resolve)=>{
			this.people[personID] = newPersonObj
			this.saveData()
			resolve()
		})
	}
	deletePerson(personID_to_delete){
		return new Promise((resolve)=>{
			this.answers = this.answers.map(answer => ({
				...answer,
				sortedPersonIDs: sortedPersonIDs.filter(personID => personID !== personID_to_delete)
			}))
			delete this.people[personID_to_delete]
			this.saveData()
			resolve()
		})
	}

	addQuestion(questionText){
		const newQuestionID = this.uuidv4()
		this.questions[newQuestionID] = questionText
		this.saveData()
	}
	deleteQuestion(questionID){
		// TODO remove answers about this question
		// TODO remove question
		// TODO save data
	}

	savePeopleRanks(questionID, ranksByPersonID){}
	saveQuestionRanks(questionIDsWithRank){}

	askQuestion(){
		// question its about
		// people to rank
	}
}



function render_personList(){
	const personListElement = document.querySelector('#personList ul')
	personListElement.innerHTML = ''

	const people = Object.entries(friend_rank.people)
	if (people.length > 0) {
		for (const entry of people) {
			const newPersonElement = document.createElement('li')
			newPersonElement.innerHTML = entry[1]
			personListElement.appendChild(newPersonElement)
		}
	}else{
		personListElement.innerHTML = '<em>no people yet</em>'
	}
}

function render_questionList(){
	const questionListElement = document.querySelector('#questionList ul')

	const questions = Object.entries(friend_rank.questions)
	if (questions.length > 0) {
		questionListElement.innerHTML = ''
		for (const entry of questions) {
			const newQuestionElement = document.createElement('li')
			newQuestionElement.innerHTML = entry[1]
			questionListElement.appendChild(newQuestionElement)
		}
	}else{
		questionListElement.innerHTML = '<em>no questions yet</em>'
	}
}

function render_rankingQuestion(){
	// const questionListElement = document.querySelector('#questionList ul')
	
	const people = Object.entries(friend_rank.people)
	const questions = Object.entries(friend_rank.questions)
	
	if (people.length > 0 && questions.length > 0) {
		console.log('hej')
	}
}

function addPerson(){
	const textField = document.querySelector('#addPerson input[name="name"]')
	const value = textField.value
	if (value !== '') {
		friend_rank.addPerson(value)
		textField.value = ''
		render_personList()
	}
}
function addQuestion(){
	const textField = document.querySelector('#addQuestion input[name="question"]')
	const value = textField.value
	if (value !== '') {
		friend_rank.addQuestion(value)
		textField.value = ''
		render_questionList()
	}
}



const friend_rank = new FriendRank()

function start(){
	console.log('start', friend_rank)

	render_personList()
	render_questionList()
	render_rankingQuestion()
}

window.addEventListener('load', ()=>{
	start()
})