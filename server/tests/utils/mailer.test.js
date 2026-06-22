jest.mock('nodemailer');
const nodemailer = require('nodemailer');

const sendMailMock = jest.fn();
nodemailer.createTransport.mockReturnValue({ sendMail: sendMailMock });

// El módulo usa createTransport en el top-level, por eso necesitamos mockear antes de requerirlo
const { sendMail, sendInvitation, sendThresholdNotification, sendSubmissionConfirmation } = require('../../src/utils/mailer');

beforeEach(() => {
  process.env.MAIL_USER = 'test@nur.edu.bo';
  sendMailMock.mockResolvedValue({ messageId: 'mock-id' });
});

describe('sendMail', () => {
  test('llama a transporter.sendMail con los parámetros correctos', async () => {
    await sendMail({ to: 'dest@nur.edu.bo', subject: 'Asunto', html: '<p>Hola</p>' });

    expect(sendMailMock).toHaveBeenCalledWith({
      from: '"NUR Encuestas" <test@nur.edu.bo>',
      to: 'dest@nur.edu.bo',
      subject: 'Asunto',
      html: '<p>Hola</p>'
    });
  });

  test('retorna la respuesta del transporter', async () => {
    sendMailMock.mockResolvedValue({ messageId: 'abc-123' });
    const result = await sendMail({ to: 'a@b.com', subject: 'S', html: '<p>H</p>' });
    expect(result.messageId).toBe('abc-123');
  });

  test('propaga el error si el transporter falla', async () => {
    sendMailMock.mockRejectedValue(new Error('SMTP Error'));
    await expect(sendMail({ to: 'a@b.com', subject: 'S', html: '' })).rejects.toThrow('SMTP Error');
  });
});

describe('sendInvitation', () => {
  test('construye el asunto con el título del formulario', async () => {
    await sendInvitation({
      to: 'inv@nur.edu.bo',
      formTitle: 'Encuesta de Satisfacción',
      invitationLink: 'http://localhost/responder/abc'
    });

    const callArgs = sendMailMock.mock.calls[0][0];
    expect(callArgs.to).toBe('inv@nur.edu.bo');
    expect(callArgs.subject).toContain('Encuesta de Satisfacción');
  });

  test('incluye el link de invitación en el HTML', async () => {
    const link = 'http://localhost/responder/form-uuid?token=token-abc';
    await sendInvitation({ to: 'a@nur.edu.bo', formTitle: 'Test', invitationLink: link });

    const callArgs = sendMailMock.mock.calls[0][0];
    expect(callArgs.html).toContain(link);
  });
});

describe('sendThresholdNotification', () => {
  test('construye el asunto con el título y la cantidad de respuestas', async () => {
    await sendThresholdNotification({ to: 'creator@nur.edu.bo', formTitle: 'Mi Encuesta', count: 50 });

    const callArgs = sendMailMock.mock.calls[0][0];
    expect(callArgs.to).toBe('creator@nur.edu.bo');
    expect(callArgs.subject).toContain('Mi Encuesta');
    expect(callArgs.subject).toContain('50');
  });

  test('incluye el conteo en el HTML', async () => {
    await sendThresholdNotification({ to: 'a@b.com', formTitle: 'Test', count: 100 });
    const callArgs = sendMailMock.mock.calls[0][0];
    expect(callArgs.html).toContain('100');
  });
});

describe('sendSubmissionConfirmation', () => {
  test('envía el email de confirmación al respondiente', async () => {
    await sendSubmissionConfirmation({ to: 'resp@nur.edu.bo', formTitle: 'Encuesta Final' });

    const callArgs = sendMailMock.mock.calls[0][0];
    expect(callArgs.to).toBe('resp@nur.edu.bo');
    expect(callArgs.subject).toContain('Encuesta Final');
  });

  test('el HTML contiene el título del formulario', async () => {
    await sendSubmissionConfirmation({ to: 'a@b.com', formTitle: 'Encuesta Especial' });
    const callArgs = sendMailMock.mock.calls[0][0];
    expect(callArgs.html).toContain('Encuesta Especial');
  });
});
