require('dotenv').config()
const bcrypt = require('bcryptjs')
const { sequelize } = require('../config/db')
const { User } = require('../models/index.js')

const seed = async () => {
  try {
    await sequelize.authenticate()

    const existing = await User.findOne({
      where: { email: 'admin@nur.edu.bo' }
    })

    if (existing) {
      console.log('El admin ya existe, nada que hacer.')
      process.exit(0)
    }

    // =========================
    // ADMIN
    // =========================
    const adminPassword = await bcrypt.hash('admin1234', 10)

    await User.create({
      email: 'admin@nur.edu.bo',
      password_hash: adminPassword,
      full_name: 'Administrador NUR',
      role: 'admin'
    })

    console.log('Admin creado exitosamente.')

    // =========================
    // ESTUDIANTES
    // =========================

    const students = [
      'juan.perez',
      'maria.gomez',
      'carlos.rojas',
      'ana.suarez',
      'luis.mendoza',
      'sofia.arias',
      'diego.lopez',
      'camila.vargas',
      'jose.mamani',
      'valeria.quispe',

      'miguel.torrez',
      'paola.rivera',
      'fernando.romero',
      'gabriela.soto',
      'andres.chavez',
      'daniela.flores',
      'ricardo.vega',
      'natalia.paredes',
      'kevin.castro',
      'laura.herrera',

      'sebastian.medina',
      'ximena.sandoval',
      'eduardo.ortiz',
      'melissa.campos',
      'omar.reyes',
      'karla.nina',
      'bruno.morales',
      'alison.gutierrez',
      'ivan.salinas',
      'paulina.mejia',

      'martin.alvarez',
      'lucia.cardenas',
      'rodrigo.beltran',
      'carla.zeballos',
      'mauricio.cespedes',
      'elena.rios',
      'samuel.valdez',
      'monica.peñaranda',
      'adrian.navarro',
      'noelia.miranda',

      'fabian.escobar',
      'renata.delgado',
      'cristian.bustos',
      'alejandra.molina',
      'hector.cabrera',
      'tatiana.velasco',
      'esteban.paz',
      'julieta.mendez',
      'marco.peredo',
      'pamela.aguilar'
    ]

    for (let i = 0; i < students.length; i++) {
      const password = `${(i % 8) + 1}`
      const password_hash = await bcrypt.hash(password, 10)

      await User.create({
        email: `${students[i]}@nur.edu.bo`,
        password_hash,
        full_name: students[i]
          .split('.')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        role: 'student'
      })

      console.log(
        `Creado: ${students[i]}@nur.edu.bo | Password: ${password}`
      )
    }

    console.log('===================================')
    console.log('50 estudiantes creados correctamente.')
    console.log('Passwords distribuidas del 1 al 8.')
    console.log('===================================')

    process.exit(0)
  } catch (error) {
    console.error('Error al crear usuarios:', error.message)
    process.exit(1)
  }
}

seed()