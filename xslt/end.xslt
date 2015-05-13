 <xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <xsl:template match="end">
        <div class="end">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:apply-templates select="signature-block|explnote|promulgation|end.reprint-note"/>
        </div>
    </xsl:template>


    <xsl:template match="signature-block">
        <div class="signature-block">
             <xsl:apply-templates select="sig.para|sig.officer"/>
        </div>
        <hr class="signature-block"/>
    </xsl:template>

    <xsl:template match="sig.para|sig.officer">
        <p class="sig-para">
            <xsl:attribute name="style">
                text-align:<xsl:value-of select="@align"/>
            </xsl:attribute>
            <xsl:apply-templates/>
        </p>
    </xsl:template>

    <xsl:template match="sig.para|sig.officer">
        <p class="sig-para">
            <xsl:attribute name="style">
                text-align:<xsl:value-of select="@align"/>
            </xsl:attribute>
            <xsl:apply-templates/>
        </p>
    </xsl:template>

    <xsl:template match="explnote">
        <div class="explnote">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <h2 class="explnote"><xsl:value-of select="heading"/></h2>
            <xsl:apply-templates select="para"/>
        </div>
            <hr class="explnote"/>
    </xsl:template>

     <xsl:template match="promulgation">
        <div class="promulgation">
            <xsl:attribute name="id">
                <xsl:value-of select="@id"/>
            </xsl:attribute>
            <xsl:apply-templates select="issue-authority|gazette-date"/>
        </div>
            <hr class="promulgation"/>
    </xsl:template>


      <xsl:template match="issue-authority">
        <p class="issue-authority"><xsl:apply-templates/></p>
        </xsl:template>

      <xsl:template match="gazette-date">
        <p class="gazette-date"><xsl:apply-templates/></p>
        </xsl:template>

    <xsl:template match="end.reprint-note">
    <div class="end-reprint-note">
        <xsl:attribute name="id">
            <xsl:value-of select="@id"/>
        </xsl:attribute>
        <xsl:apply-templates select="reprint.index|reprint.notes"/>
    </div>
    </xsl:template>


    <xsl:template match="reprint.index">
        <div class="reprint-index">
            <h4 class="reprint-index"><xsl:value-of select="heading"/></h4>
             <xsl:apply-templates select="para/list"/>

        </div>
        <hr class="reprint-index"/>
    </xsl:template>



    <xsl:template match="reprint.notes">
        <div class="reprint-notes">
            <h5 class="reprint-notes"><xsl:value-of select="heading"/></h5>

                <xsl:apply-templates select="reprint.note"/>
        </div>
    </xsl:template>

    <xsl:template match="reprint.note">
        <div class="reprint-note">
            <h6 class="reprint-note labelled">
                <span class="label"><xsl:value-of select="label"/></span>
                <xsl:value-of select="heading"/>
            </h6>
            <ul class="reprint-note labelled">
                <xsl:apply-templates select="para|list"/>
            </ul>
        </div>
    </xsl:template>


    <xsl:template match="reprint.amend">
        <xsl:apply-templates select="reprint.amend"/>
    </xsl:template>

</xsl:stylesheet>

