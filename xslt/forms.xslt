<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    <xsl:template match="form">
      <div class="form">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
            <h4 class="form"><span class="label">Form&#160;<xsl:value-of select="label"/></span>
            <xsl:value-of select="heading"/></h4>
            <xsl:apply-templates />
      </div>
    </xsl:template>

    <xsl:template match="form/label|form/heading">
     </xsl:template>


     <xsl:template match="form.body">
        <div class="form-body">
            <xsl:apply-templates />
        </div>
     </xsl:template>


    <xsl:template match="authorisation">
      <p class="authorisation">
        <xsl:apply-templates />
      </p>
    </xsl:template>



    <xsl:template match="form.body/para/label-para/label">
        <h5 class="label-para">
            <span class="label focus-link">
             <xsl:call-template name="parentquote"/>
             <xsl:value-of select="."/>
            </span>
        </h5>
    </xsl:template>

    <xsl:template match="signature-block">
        <div class="signature-block">
             <xsl:apply-templates />
        </div>

    </xsl:template>

    <xsl:template match="sig.para|sig.officer">
        <p class="sig-para">
            <xsl:attribute name="style">
                text-align:<xsl:value-of select="@align"/>
            </xsl:attribute>
            <xsl:apply-templates/>
        </p>
    </xsl:template>


</xsl:stylesheet>