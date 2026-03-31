export const baseTemplate = ({
  titulo,
  mensaje,
  botonTexto,
  botonUrl,
}: {
  titulo: string;
  mensaje: string;
  botonTexto?: string;
  botonUrl?: string;
}) => {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="
    margin:0;
    padding:0;
    background:#f6f6f6;
    font-family: Inter, Arial, sans-serif;
  ">

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">

          <table width="600" cellpadding="0" cellspacing="0" style="
            background:white;
            margin-top:20px;
            border-radius:12px;
            overflow:hidden;
          ">

            <!-- Header -->
            <tr>
              <td style="
                background:#4C00F7;
                padding:24px;
                text-align:center;
                color:white;
                font-size:24px;
                font-weight:600;
              ">
                Nook Heladería
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="
                padding:32px;
                color:#595959;
                font-size:16px;
                line-height:1.5;
              ">

                <h2 style="
                  color:#4C00F7;
                  margin-top:0;
                  font-weight:600;
                ">
                  ${titulo}
                </h2>

                <p>
                  ${mensaje}
                </p>

                ${
                  botonUrl
                    ? `
                    <div style="margin-top:24px;">
                      <a href="${botonUrl}" style="
                        background:#4C00F7;
                        color:white;
                        padding:14px 22px;
                        text-decoration:none;
                        border-radius:8px;
                        display:inline-block;
                        font-weight:500;
                      ">
                        ${botonTexto}
                      </a>
                    </div>
                  `
                    : ""
                }

              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="
                background:#f6f6f6;
                padding:20px;
                text-align:center;
                font-size:12px;
                color:#888;
              ">
                Nook Heladería de Autora 🍦<br/>
                Hecho con cariño
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;
};