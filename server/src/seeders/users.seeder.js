require('dotenv').config()
const bcrypt = require('bcryptjs')
const { sequelize } = require('../config/db')
const { User } = require('../models/index.js')

const seed = async () => {
  try {
    await sequelize.authenticate()

    // =========================
    // ESTUDIANTES
    // =========================

    const studentPassword = await bcrypt.hash('12345678', 10)

    const studentCodes = [
      '764590',
      '732530',
      '781245',
      '745812',
      '798456',
      '756321',
      '712345',
      '734567',
      '765432',
      '723456',

      '754321',
      '776655',
      '788999',
      '700123',
      '711222',
      '722333',
      '733444',
      '744555',
      '755666',
      '766777',

      '777888',
      '788111',
      '799222',
      '701333',
      '712444',
      '723555',
      '734666',
      '745777',
      '756888',
      '767999',

      '778000',
      '789101',
      '790202',
      '701303',
      '712404',
      '723505',
      '734606',
      '745707',
      '756808',
      '767909',

      '778101',
      '789202',
      '790303',
      '701404',
      '712505',
      '723606',
      '734707',
      '745808',
      '756909',
      '767010'
    ]

    for (const code of studentCodes) {
      await User.create({
        email: `${code}@nur.edu.bo`,
        password_hash: studentPassword,
        full_name: `Estudiante ${code}`
    })

      console.log(`Creado: ${code}@nur.edu.bo`)
    }

    console.log('===================================')
    console.log('50 estudiantes creados correctamente.')
    console.log('Password de todos: 12345678')
    console.log('===================================')

    process.exit(0)
  } catch (error) {
    console.error('Error al crear usuarios:', error.message)
    process.exit(1)
  }
}

seed()